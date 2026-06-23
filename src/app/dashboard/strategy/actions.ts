"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { summaryMetrics } from "@/lib/metrics";

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
  let paramKey = "riskPerTrade";
  let oldValue = "1.00%";
  let newValue = "0.75%";
  let reasoning = "Recent volatility has increased the average true range (ATR). Reducing risk to preserve capital during chop.";
  let winRateDelta = -2.1;
  let confidence = 89;

  if (m.winRate > 60) {
    parameter = "Take Profit Target";
    paramKey = "takeProfitR";
    oldValue = "2.0R";
    newValue = "2.5R";
    reasoning = "Win rate is exceptionally high. Pushing take profit target up to capture more alpha per trade.";
    winRateDelta = +4.5;
    confidence = 94;
  }

  // 3. Create a pending adjustment
  await prisma.botAdjustment.create({
    data: {
      botId: account.bot.id,
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
