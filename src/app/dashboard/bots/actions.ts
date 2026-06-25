"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseStrategyParams, type StrategyParams } from "@/lib/strategy-schema";
import { PLANS, type Plan } from "@/lib/plans";
import type { StrategyKind, Prisma } from "@prisma/client";

export async function createBot({
  accountId,
  strategyName,
  strategyKind,
  params,
}: {
  accountId: string;
  strategyName: string;
  strategyKind: StrategyKind;
  params: StrategyParams;
}) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Not signed in" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { ok: false, error: "User not found" };

    const planConfig = PLANS[user.plan as Plan];

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { bot: true },
    });

    if (!account || account.userId !== user.id) {
      return { ok: false, error: "Account not found or access denied" };
    }

    if (account.bot) {
      return { ok: false, error: "This account already has a bot attached." };
    }

    // Validate parameters
    const parsed = parseStrategyParams(params);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    // Create a new strategy profile specifically for this bot
    const strategy = await prisma.strategy.create({
      data: {
        userId: user.id,
        name: strategyName,
        kind: strategyKind,
        params: parsed.params as unknown as Prisma.InputJsonValue,
      },
    });

    // Enforce bot limits:
    const activeBotsCount = await prisma.bot.count({
      where: {
        account: { userId: user.id },
      },
    });

    if (activeBotsCount >= planConfig.accountLimit) {
      return { ok: false, error: `Your ${planConfig.name} plan is limited to ${planConfig.accountLimit} bot(s).` };
    }

    await prisma.bot.create({
      data: {
        accountId: account.id,
        strategyId: strategy.id,
        status: "STOPPED", // Always start stopped
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bots");
    return { ok: true };
  } catch (err) {
    console.error("createBot error", err);
    return { ok: false, error: "Failed to create bot." };
  }
}
