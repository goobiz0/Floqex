"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  parseStrategyParams,
  coerceStrategyParams,
  applyRawParam,
  PARAM_LABELS,
  rawParamValue,
  type StrategyParams,
} from "@/lib/strategy-schema";

type Result = { ok: boolean; error?: string };

async function resolveStrategy(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      accounts: { take: 1, orderBy: { createdAt: "asc" }, include: { bot: true } },
      strategies: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });
  const bot = user?.accounts[0]?.bot ?? null;
  const strategyId = bot?.strategyId ?? user?.strategies[0]?.id ?? null;
  return { botId: bot?.id ?? null, strategyId };
}

/**
 * Persist tuned strategy parameters. Bounds are re-validated server-side via
 * parseStrategyParams, so risk ceilings cannot be widened by a crafted request,
 * regardless of the client. Each changed parameter is recorded in the change log.
 */
export async function saveStrategy(input: unknown): Promise<Result> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "You are not signed in." };

  const parsed = parseStrategyParams(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const next = parsed.params;

  const { botId, strategyId } = await resolveStrategy(clerkId);
  if (!strategyId) return { ok: false, error: "No strategy to update yet." };

  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) return { ok: false, error: "Strategy not found." };
  const current = coerceStrategyParams(strategy.params);

  const changed = (Object.keys(PARAM_LABELS) as (keyof StrategyParams)[]).filter(
    (k) => current[k] !== next[k],
  );
  if (changed.length === 0) return { ok: true };

  await prisma.$transaction([
    prisma.strategy.update({
      where: { id: strategyId },
      data: { params: next as object, version: { increment: 1 } },
    }),
    ...(botId
      ? changed.map((k) =>
          prisma.botAdjustment.create({
            data: {
              botId,
              strategyId,
              parameter: PARAM_LABELS[k],
              paramKey: k,
              oldValue: rawParamValue(k, current[k]),
              newValue: rawParamValue(k, next[k]),
              source: "USER",
              status: "APPLIED",
            },
          }),
        )
      : []),
  ]);

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}

/**
 * Approve a pending bot suggestion: atomically write the proposed value into
 * Strategy.params (re-validated against the bounds, so an out-of-range proposal
 * is rejected), bump the strategy version, and mark the row APPLIED. The change
 * takes effect immediately rather than waiting on the engine to interpret it.
 */
export async function approveSuggestion(adjustmentId: string): Promise<Result> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "You are not signed in." };
  const { botId, strategyId } = await resolveStrategy(clerkId);
  if (!botId || !strategyId) return { ok: false, error: "No bot found." };

  const adj = await prisma.botAdjustment.findFirst({
    where: { id: adjustmentId, botId, status: "PENDING" },
  });
  if (!adj) return { ok: false, error: "Suggestion not found." };

  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) return { ok: false, error: "Strategy not found." };

  const current = coerceStrategyParams(strategy.params);
  const applied = applyRawParam(current, adj.paramKey, adj.newValue);
  if (!applied.ok) return { ok: false, error: applied.error };

  await prisma.$transaction([
    prisma.strategy.update({
      where: { id: strategyId },
      data: { params: applied.params as object, version: { increment: 1 } },
    }),
    prisma.botAdjustment.update({ where: { id: adj.id }, data: { status: "APPLIED" } }),
  ]);
  revalidatePath("/dashboard/strategy");
  return { ok: true };
}

/** Reject a pending bot suggestion (status -> REJECTED). */
export async function rejectSuggestion(adjustmentId: string): Promise<Result> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "You are not signed in." };
  const { botId } = await resolveStrategy(clerkId);
  if (!botId) return { ok: false, error: "No bot found." };

  const adj = await prisma.botAdjustment.findFirst({
    where: { id: adjustmentId, botId, status: "PENDING" },
  });
  if (!adj) return { ok: false, error: "Suggestion not found." };

  await prisma.botAdjustment.update({ where: { id: adj.id }, data: { status: "REJECTED" } });
  revalidatePath("/dashboard/strategy");
  return { ok: true };
}
