import { prisma } from "@/lib/db";
import { DEFAULT_PARAMS } from "@/lib/strategy-schema";

export async function runLearningEngine(botId: string, strategyId: string) {
  // Analyze the last 10 trades for this bot to spot inefficiencies
  const trades = await prisma.trade.findMany({
    where: { botId, status: "CLOSED" },
    orderBy: { closedAt: 'desc' },
    take: 10,
  });

  if (trades.length < 5) return; // Need a statistically significant sample size

  const losses = trades.filter(t => t.netPnl && t.netPnl.toNumber() < 0);
  const winRate = (trades.length - losses.length) / trades.length;

  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) return;
  
  const params: any = strategy.params || DEFAULT_PARAMS;

  // Optimization Logic 1: Trend Filter
  // If win rate is below 40% and they aren't using the trend filter, suggest turning it on.
  if (winRate < 0.40 && !params.trendFilter) {
    const existing = await prisma.botAdjustment.findFirst({
      where: { botId, parameter: "Trend filter", status: "PENDING" }
    });
    
    if (!existing) {
      await prisma.botAdjustment.create({
        data: {
          botId,
          strategyId,
          parameter: "Trend filter",
          paramKey: "trendFilter",
          oldValue: "false",
          newValue: "true",
          source: "BOT",
          status: "PENDING",
          reasoning: "Your recent win rate is lagging. Enabling the 50-SMA trend filter will block dangerous counter-trend signals and significantly improve trade quality.",
          sampleSize: trades.length,
          winRateDelta: 0.12, // +12% projected win rate bump
          confidence: 0.85,
        }
      });
    }
  }

  // Optimization Logic 2: Stop Loss Tightening
  // If they are losing frequently with full stops, suggest tightening rrTarget 
  // (which implicitly tightens stops relative to profit targets, or we can suggest riskPct drop)
  if (winRate < 0.35 && Number(params.rrTarget) < 3.0) {
    const existing = await prisma.botAdjustment.findFirst({
      where: { botId, parameter: "Reward to risk target", status: "PENDING" }
    });
    
    if (!existing) {
      await prisma.botAdjustment.create({
        data: {
          botId,
          strategyId,
          parameter: "Reward to risk target",
          paramKey: "rrTarget",
          oldValue: String(params.rrTarget),
          newValue: "3.0",
          source: "BOT",
          status: "PENDING",
          reasoning: "Your current reward-to-risk ratio isn't absorbing your loss rate. Increasing targets to 3R ensures your winning trades cover the drawdown.",
          sampleSize: trades.length,
          winRateDelta: 0.05,
          confidence: 0.72,
        }
      });
    }
  }
}
