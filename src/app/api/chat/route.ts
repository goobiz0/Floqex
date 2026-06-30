import { streamText, tool, convertToModelMessages, type UIMessage } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { PARAM_BOUNDS } from "@/lib/strategy-schema";
import { type Plan } from "@/lib/plans";
import { getMochiUsage, recordMochiUsage } from "@/lib/mochi-usage";
import { summaryMetrics, byInstrument, bySession, byWeekday, type TradeRow } from "@/lib/metrics";
import { kelly, expectancy } from "@/lib/calculators";

export const maxDuration = 30;

function chatModel() {
  return google("gemini-2.5-flash");
}

const boundsHelp = (Object.keys(PARAM_BOUNDS) as (keyof typeof PARAM_BOUNDS)[])
  .map((k) => `${k} ${PARAM_BOUNDS[k].min}-${PARAM_BOUNDS[k].max}${PARAM_BOUNDS[k].suffix ?? ""}`)
  .join(", ");

const round = (n: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

function downsample(arr: number[], target: number): number[] {
  if (arr.length <= target) return arr;
  const step = (arr.length - 1) / (target - 1);
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

function monteCarloSim(a: {
  startingBalance?: number;
  riskPct: number;
  winRate: number;
  rewardRisk: number;
  trades?: number;
  simulations?: number;
}) {
  const sims = Math.min(2000, Math.max(50, Math.floor(a.simulations ?? 500)));
  const n = Math.min(500, Math.max(5, Math.floor(a.trades ?? 100)));
  const wr = Math.min(95, Math.max(5, a.winRate)) / 100;
  const rr = Math.min(10, Math.max(0.2, a.rewardRisk));
  const riskFrac = Math.min(10, Math.max(0.1, a.riskPct)) / 100;
  const start = Math.max(1, a.startingBalance ?? 10000);

  const finals: number[] = [];
  let ruin = 0;
  let samplePath: number[] = [start];

  for (let s = 0; s < sims; s++) {
    let bal = start;
    let minBal = start;
    const path: number[] | null = s === 0 ? [start] : null;
    for (let i = 0; i < n; i++) {
      const risk = bal * riskFrac;
      bal += Math.random() < wr ? risk * rr : -risk;
      if (bal < 0) bal = 0;
      if (bal < minBal) minBal = bal;
      if (path) path.push(bal);
    }
    if (minBal <= start * 0.5) ruin++;
    finals.push(bal);
    if (path) samplePath = path;
  }

  finals.sort((x, y) => x - y);
  const pct = (p: number) => finals[Math.min(finals.length - 1, Math.floor(p * finals.length))];

  return {
    startingBalance: start,
    trades: n,
    simulations: sims,
    winRate: round(wr * 100, 1),
    rewardRisk: rr,
    riskPct: round(riskFrac * 100, 2),
    p10: round(pct(0.1)),
    p50: round(pct(0.5)),
    p90: round(pct(0.9)),
    mean: round(finals.reduce((acc, x) => acc + x, 0) / finals.length),
    ruinProbability: round((ruin / sims) * 100, 1),
    samplePath: downsample(samplePath, 40).map((v) => round(v)),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRows(trades: any[]): TradeRow[] {
  return trades.map((t) => ({
    id: t.id,
    instrument: t.instrument,
    direction: t.direction as "LONG" | "SHORT",
    session: t.session as "ASIA" | "NY",
    status: t.status as "OPEN" | "CLOSED",
    entryPrice: Number(t.entryPrice),
    exitPrice: t.exitPrice != null ? Number(t.exitPrice) : null,
    stopPrice: Number(t.stopPrice),
    targetPrice: Number(t.targetPrice),
    sizeUnits: Number(t.sizeUnits),
    netPnl: t.netPnl != null ? Number(t.netPnl) : null,
    grossPnl: t.grossPnl != null ? Number(t.grossPnl) : null,
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    openedAt: t.openedAt instanceof Date ? t.openedAt.toISOString() : String(t.openedAt),
    closedAt: t.closedAt instanceof Date ? t.closedAt.toISOString() : t.closedAt ? String(t.closedAt) : null,
    narrative: t.narrative,
    screenshotUrl: t.screenshotUrl,
  }));
}

const TRADE_SELECT = {
  id: true, instrument: true, direction: true, session: true, status: true,
  entryPrice: true, exitPrice: true, stopPrice: true, targetPrice: true, sizeUnits: true,
  netPnl: true, grossPnl: true, rMultiple: true,
  openedAt: true, closedAt: true, narrative: true, screenshotUrl: true,
} as const;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, plan: true } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const usage = await getMochiUsage(user.id, user.plan as Plan);
  if (usage.blocked) {
    const which = usage.window === "week" ? "weekly" : "5-hour";
    return new Response(
      JSON.stringify({
        error: `You've reached your Mochi ${which} token limit on the ${String(user.plan)} plan. It resets as the window rolls forward, or you can upgrade for a larger allowance.`,
      }),
      { status: 429, headers: { "content-type": "application/json" } },
    );
  }

  const systemPrompt = `You are Mochi, an expert trading copilot inside the Floqex app.
You help the user understand their performance, manage their trading bots, run numbers, and tune strategy parameters.

Operating rules:
- Be concise. Short, direct answers. Don't pad. This keeps the user's token budget healthy.
- If a request is ambiguous or missing a detail you genuinely need, ask ONE short clarifying question first.
- For ANY arithmetic, call the calculate tool. Never do mental math.
- For projections, risk-of-ruin, or "what if" questions, call runMonteCarlo and briefly interpret the result.
- For performance questions, call getPerformance (accepts optional days window, default 7).
- For specific recent trade data, call getRecentTrades (returns up to 20 most recent trades with full detail).
- For edge analysis (expectancy, Kelly fraction, verdict), call analyzeEdge.
- For P/L broken down by instrument, session, or weekday, call getBreakdown.
- For bot questions, call getBotStatus.
- For account balances, paper trading equity, and broker connection status, call getAccountDetails.
- To change strategy settings, call updateStrategyParams; the user approves before anything is applied.

Allowed parameters for updateStrategyParams: ${boundsHelp}`;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: chatModel(),
    messages: modelMessages,
    system: systemPrompt,
    onFinish: ({ usage: u }) => {
      const x = u as unknown as Record<string, number | undefined>;
      void recordMochiUsage(user.id, {
        promptTokens: x.inputTokens ?? x.promptTokens,
        completionTokens: x.outputTokens ?? x.completionTokens,
        totalTokens: x.totalTokens,
      });
    },
    tools: {
      getPerformance: tool({
        description:
          "Get the user's REAL trading performance (win rate, net P/L, profit factor, expectancy, avg win/loss). Accepts optional days window (default 7).",
        inputSchema: z.object({
          days: z.number().optional().describe("Look-back window in days, default 7"),
        }),
        execute: async ({ days = 7 }) => {
          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          const trades = await prisma.trade.findMany({
            where: { account: { userId: user.id }, closedAt: { gte: since } },
            select: TRADE_SELECT,
          });
          const s = summaryMetrics(toRows(trades));
          return {
            days,
            trades: s.count,
            winRate: `${s.winRate.toFixed(1)}%`,
            netPnl: `${s.total >= 0 ? "+" : ""}$${s.total.toFixed(2)}`,
            profitFactor: Number.isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : "Infinity",
            expectancy: `${s.expectancy >= 0 ? "+" : ""}${s.expectancy.toFixed(2)}R`,
            avgWin: `$${s.avgWin.toFixed(2)}`,
            avgLoss: `$${s.avgLoss.toFixed(2)}`,
          };
        },
      }),
      getRecentTrades: tool({
        description: "Get the raw data for the user's most recent trades, including entry/exit prices, PnL, duration, and narrative.",
        inputSchema: z.object({
          limit: z.number().optional().describe("Number of trades to fetch, default 10, max 20"),
        }),
        execute: async ({ limit = 10 }) => {
          const l = Math.min(20, Math.max(1, limit));
          const trades = await prisma.trade.findMany({
            where: { account: { userId: user.id } },
            orderBy: { openedAt: "desc" },
            take: l,
            select: TRADE_SELECT,
          });
          return { trades: toRows(trades) };
        },
      }),
      getAccountDetails: tool({
        description: "Check the user's account balance, connected broker status, and equity.",
        inputSchema: z.object({}),
        execute: async () => {
          const account = await prisma.account.findFirst({
            where: { userId: user.id },
            select: { id: true, balance: true, broker: true, mode: true, currency: true },
          });
          return { account: account || null };
        },
      }),
      getBotStatus: tool({
        description:
          "Check the user's REAL bots: how many exist, how many are running, open positions, and each bot's strategy.",
        inputSchema: z.object({}),
        execute: async () => {
          const bots = await prisma.bot.findMany({
            where: { account: { userId: user.id } },
            include: {
              account: { select: { nickname: true } },
              strategy: { select: { name: true } },
            },
          });
          const openPositions = await prisma.trade.count({
            where: { account: { userId: user.id }, status: "OPEN" },
          });
          return {
            bots: bots.length,
            running: bots.filter((b: { status: string }) => b.status === "RUNNING").length,
            openPositions,
            detail: bots.map((b: { account?: { nickname: string } | null; status: string; strategy: { name: string } }) => ({
              account: b.account?.nickname ?? "Unassigned",
              status: b.status,
              strategy: b.strategy.name,
            })),
          };
        },
      }),
      calculate: tool({
        description:
          "Evaluate a basic arithmetic expression precisely. Use for ALL math (position sizing, R multiples, percentages).",
        inputSchema: z.object({
          expression: z.string().describe("A math expression, e.g. (10000*0.01)/15"),
        }),
        execute: async ({ expression }) => {
          const expr = expression.trim();
          if (!/^[-+*/%.()0-9eE\s]+$/.test(expr) || expr.length > 200) {
            return { error: "Only basic arithmetic is supported." };
          }
          try {
            const fn = new Function(`"use strict"; return (${expr});`);
            const value = fn();
            if (typeof value !== "number" || !Number.isFinite(value))
              return { error: "Could not evaluate that." };
            return { expression: expr, result: round(value, 6) };
          } catch {
            return { error: "Invalid expression." };
          }
        },
      }),
      runMonteCarlo: tool({
        description:
          "Simulate an account's equity over many trades to show the range of outcomes and risk of a large drawdown. Returns percentiles and a sample equity path for charting.",
        inputSchema: z.object({
          startingBalance: z.number().optional().describe("Starting balance, default 10000"),
          riskPct: z.number().describe("Percent of balance risked per trade, e.g. 1"),
          winRate: z.number().describe("Win probability as a percent, e.g. 55"),
          rewardRisk: z.number().describe("Reward to risk multiple, e.g. 2"),
          trades: z.number().optional().describe("Number of trades to simulate, default 100"),
          simulations: z.number().optional().describe("Number of simulated paths, default 500"),
        }),
        execute: async (args) => monteCarloSim(args),
      }),
      analyzeEdge: tool({
        description:
          "Analyze the user's real trading edge using ALL historical closed trades: expectancy, break-even win rate, Kelly-suggested risk %, and a plain-English verdict on whether the edge is statistically real.",
        inputSchema: z.object({}),
        execute: async () => {
          const trades = await prisma.trade.findMany({
            where: { account: { userId: user.id } },
            select: TRADE_SELECT,
          });
          const s = summaryMetrics(toRows(trades));
          if (s.count === 0) return { error: "No closed trades to analyze yet." };
          const payoff = s.avgLoss > 0 ? s.avgWin / s.avgLoss : 0;
          const k = kelly(s.winRate, payoff);
          const e = expectancy(s.winRate, s.avgWin, s.avgLoss);
          const breakEvenWr = s.avgWin + s.avgLoss > 0 ? (s.avgLoss / (s.avgWin + s.avgLoss)) * 100 : 100;
          const hasEdge = e.perR > 0 && s.count >= 20;
          return {
            trades: s.count,
            winRate: `${s.winRate.toFixed(1)}%`,
            breakEvenWinRate: `${breakEvenWr.toFixed(1)}%`,
            expectancyPerR: `${e.perR >= 0 ? "+" : ""}${e.perR.toFixed(2)}R`,
            expectancyPerTrade: `${e.perTrade >= 0 ? "+" : ""}$${e.perTrade.toFixed(2)}`,
            kellyPct: `${(k.fraction * 100).toFixed(1)}%`,
            halfKellyPct: `${(k.halfKelly * 100).toFixed(1)}%`,
            profitFactor: Number.isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : "Infinity",
            verdict: hasEdge
              ? "Edge detected. Positive expectancy with a meaningful sample size."
              : s.count < 20
              ? `Sample too small (${s.count} trades). Need at least 20 to draw conclusions.`
              : "No edge detected. System is currently at or below breakeven.",
          };
        },
      }),
      getBreakdown: tool({
        description:
          "Show the user's net P/L broken down by instrument, session (ASIA/NY), and day of week, using ALL historical closed trades.",
        inputSchema: z.object({}),
        execute: async () => {
          const trades = await prisma.trade.findMany({
            where: { account: { userId: user.id } },
            select: TRADE_SELECT,
          });
          const rows = toRows(trades);
          return {
            byInstrument: byInstrument(rows),
            bySession: bySession(rows),
            byWeekday: byWeekday(rows),
          };
        },
      }),
      updateStrategyParams: tool({
        description:
          "Propose an update to the user's trading strategy parameters. The user must accept or decline before anything is applied.",
        inputSchema: z.object({
          riskPct: z.number().optional().describe("Risk percentage per trade"),
          takeProfit: z.number().optional().describe("Take profit multiplier"),
          stopLoss: z.number().optional().describe("Stop loss multiplier"),
          maxDrawdown: z.number().optional().describe("Maximum drawdown allowed"),
        }),
        // No execute — human-in-the-loop. Client calls addToolResult after user accepts/declines.
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
