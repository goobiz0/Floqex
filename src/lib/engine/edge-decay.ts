import { prisma } from "../db";
import { recordBotStatus } from "./feedback";
import { sendUrgentAlert } from "../alerting";

const EDGE_DECAY_THRESHOLD = 0.20; // 20% relative drop in win rate
const RECENT_TRADES_WINDOW = 20;   // need at least 20 trades recently to judge
const BASELINE_TRADES_MIN = 50;    // need at least 50 historical trades to form a baseline

/**
 * Evaluates whether a strategy's edge is decaying.
 * Compares the win rate of the most recent trades against the historical baseline.
 * If the relative win rate drops by more than the threshold, it pauses the bot.
 */
export async function checkEdgeDecay(botId: string) {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: { account: true }
  });

  if (!bot || bot.status !== "RUNNING" || bot.edgeDecayPaused) return;

  // Get all closed trades for this bot ordered by newest first
  const closedTrades = await prisma.trade.findMany({
    where: { botId, status: "CLOSED" },
    orderBy: { closedAt: 'desc' },
    select: { netPnl: true }
  });

  if (closedTrades.length < BASELINE_TRADES_MIN + RECENT_TRADES_WINDOW) {
    // Not enough data to form a baseline and a recent window
    return;
  }

  const recentTrades = closedTrades.slice(0, RECENT_TRADES_WINDOW);
  const baselineTrades = closedTrades.slice(RECENT_TRADES_WINDOW);

  const calculateWinRate = (trades: { netPnl: { toNumber: () => number } | null }[]) => {
    if (trades.length === 0) return 0;
    const wins = trades.filter(t => t.netPnl && t.netPnl.toNumber() > 0).length;
    return wins / trades.length;
  };

  const recentWinRate = calculateWinRate(recentTrades);
  const baselineWinRate = calculateWinRate(baselineTrades);

  // If the historical win rate was 0 (which shouldn't happen with a running bot with 50 trades, but still)
  if (baselineWinRate === 0) return;

  const threshold = bot.edgeDecayThreshold ? Number(bot.edgeDecayThreshold) : EDGE_DECAY_THRESHOLD;
  const relativeDrop = (baselineWinRate - recentWinRate) / baselineWinRate;

  if (relativeDrop >= threshold) {
    console.warn(`[EDGE DECAY] Bot ${botId} decayed! Baseline WR: ${baselineWinRate.toFixed(2)}, Recent WR: ${recentWinRate.toFixed(2)}`);
    
    // Pause the bot
    await prisma.bot.update({
      where: { id: botId },
      data: {
        status: "STOPPED",
        edgeDecayPaused: true,
      }
    });

    if (bot.accountId) {
      await recordBotStatus({
        botId,
        accountId: bot.accountId,
        kind: "RISK",
        message: `Edge Decay Detected: Strategy win rate dropped from ${(baselineWinRate * 100).toFixed(1)}% to ${(recentWinRate * 100).toFixed(1)}%. Bot paused for protection.`,
      });

      await sendUrgentAlert(
        bot.userId, 
        "RISK", 
        "Edge Decay Detected", 
        `Your bot ${bot.name} has been paused. Its recent win rate dropped significantly compared to its historical baseline.`,
        { botId }
      );
    }
  }
}
