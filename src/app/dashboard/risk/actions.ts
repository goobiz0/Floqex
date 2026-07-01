"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkActionRateLimit } from "@/lib/ratelimit";

const WeightSchema = z.object({
  botId: z.string().max(100),
  weight: z.number().min(0).max(100).nullable(),
});

const SetRiskPolicySchema = z.object({
  maxPortfolioDrawdown: z.number().min(0).max(10000000).nullable().optional(),
  weights: z.array(WeightSchema).optional(),
}).strict();

async function currentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
}

/**
 * Global kill switch. Flips the portfolio halt latch (enforced in validateRisk)
 * and stops every running bot immediately, narrating the action on each affected
 * account's agent feed so the audit trail is complete.
 */
export async function haltAllBots() {
  const rateLimitOk = await checkActionRateLimit("haltAllBots", 10, "1 m");
  if (!rateLimitOk) return { ok: false, error: "Rate limit exceeded" };

  const user = await currentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const running = await prisma.bot.findMany({
    where: { userId: user.id, status: "RUNNING" },
    select: { id: true, accountId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { tradingHalted: true } });
    await tx.bot.updateMany({ where: { userId: user.id, status: "RUNNING" }, data: { status: "STOPPED" } });
    for (const b of running) {
      if (!b.accountId) continue;
      await tx.agentEvent.create({
        data: {
          botId: b.id,
          accountId: b.accountId,
          kind: "RISK",
          message: "Portfolio kill switch engaged. Bot stopped and new entries blocked until trading resumes.",
        },
      });
    }
  });

  revalidatePath("/dashboard/risk");
  revalidatePath("/dashboard");
  return { ok: true, stopped: running.length };
}

/**
 * Lift the halt. Bots stay STOPPED on purpose; the trader restarts each one
 * deliberately rather than having the whole book spring back to life at once.
 */
export async function resumeTrading() {
  const rateLimitOk = await checkActionRateLimit("resumeTrading", 10, "1 m");
  if (!rateLimitOk) return { ok: false, error: "Rate limit exceeded" };

  const user = await currentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  await prisma.user.update({ where: { id: user.id }, data: { tradingHalted: false } });
  revalidatePath("/dashboard/risk");
  return { ok: true };
}

/** Set the portfolio drawdown limit (USD) and per-bot risk-budget weights. */
export async function setRiskPolicy(input: {
  maxPortfolioDrawdown?: number | null;
  weights?: { botId: string; weight: number | null }[];
}) {
  const parsed = SetRiskPolicySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const rateLimitOk = await checkActionRateLimit("setRiskPolicy", 20, "1 m");
  if (!rateLimitOk) return { ok: false, error: "Rate limit exceeded" };

  const user = await currentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const limit =
    input.maxPortfolioDrawdown == null || Number.isNaN(input.maxPortfolioDrawdown)
      ? null
      : Math.max(0, Math.min(10_000_000, input.maxPortfolioDrawdown));

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { maxPortfolioDrawdown: limit } });
    for (const w of input.weights ?? []) {
      const weight = w.weight == null ? null : Math.max(0, Math.min(100, w.weight));
      // Scope the update to this user's bots so a crafted botId can't touch another account.
      await tx.bot.updateMany({ where: { id: w.botId, userId: user.id }, data: { riskWeight: weight } });
    }
  });

  revalidatePath("/dashboard/risk");
  return { ok: true };
}
