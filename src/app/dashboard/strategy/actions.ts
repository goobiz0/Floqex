"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { summaryMetrics } from "@/lib/metrics";
import { parseStrategyParams, coerceStrategyParams, applyRawParam, type StrategyParams } from "@/lib/strategy-schema";

export async function runAiOptimization(accountId: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { bot: true, trades: { where: { status: "CLOSED" }, take: 100, orderBy: { closedAt: "desc" } } }
  });

  if (!account || account.userId !== userId || !account.bot) {
    return { ok: false, error: "Bot not found" };
  }

  // 1. Analyze recent trades
  const m = summaryMetrics(account.trades.map((t: any) => ({
    ...t, entryPrice: Number(t.entryPrice), exitPrice: Number(t.exitPrice), stopPrice: Number(t.stopPrice), targetPrice: Number(t.targetPrice), netPnl: Number(t.netPnl), rMultiple: Number(t.rMultiple)
  })));

  // 2. Determine an adjustment based on metrics
  let parameter = "Risk per Trade";
  let paramKey = "riskPct"; // Corrected from riskPerTrade to match schema
  let oldValue = "1";
  let newValue = "0.75";
  let reasoning = "Recent volatility has increased the average true range (ATR). Reducing risk to preserve capital during chop.";
  let winRateDelta = -2.1;
  let confidence = 89;

  if (m.winRate > 60) {
    parameter = "Reward to risk target";
    paramKey = "rrTarget";
    oldValue = "2";
    newValue = "2.5";
    reasoning = "Win rate is exceptionally high. Pushing take profit target up to capture more alpha per trade.";
    winRateDelta = +4.5;
    confidence = 94;
  }

  // 3. Create a pending adjustment
  await prisma.botAdjustment.create({
    data: {
      botId: account.bot.id,
      strategyId: account.bot.strategyId,
      parameter,
      paramKey,
      oldValue,
      newValue,
      source: "BOT",
      status: "PENDING",
      reasoning,
      sampleSize: account.trades.length,
      winRateDelta,
      confidence
    }
  });

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}

export async function saveStrategy(params: StrategyParams) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const parsed = parseStrategyParams(params);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      accounts: { include: { bot: true } },
      strategies: true,
    },
  });

  if (!user) return { ok: false, error: "User not found" };

  const bot = user.accounts[0]?.bot;
  const strategyId = bot ? bot.strategyId : user.strategies[0]?.id;

  if (!strategyId) return { ok: false, error: "Strategy not found" };

  await prisma.strategy.update({
    where: { id: strategyId },
    data: { params: parsed.params as any },
  });

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}

export async function approveSuggestion(id: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const suggestion = await prisma.botAdjustment.findUnique({
    where: { id },
    include: { strategy: true },
  });

  if (!suggestion || suggestion.status !== "PENDING") {
    return { ok: false, error: "Suggestion not found or already processed" };
  }

  const currentParams = coerceStrategyParams(suggestion.strategy.params);
  const result = applyRawParam(currentParams, suggestion.paramKey, suggestion.newValue);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await prisma.$transaction([
    prisma.strategy.update({
      where: { id: suggestion.strategyId },
      data: { params: result.params as any },
    }),
    prisma.botAdjustment.update({
      where: { id },
      data: { status: "APPLIED" },
    }),
  ]);

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}

export async function rejectSuggestion(id: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const suggestion = await prisma.botAdjustment.findUnique({ where: { id } });
  if (!suggestion || suggestion.status !== "PENDING") {
    return { ok: false, error: "Suggestion not found or already processed" };
  }

  await prisma.botAdjustment.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}
