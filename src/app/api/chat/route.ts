import { streamText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { PARAM_BOUNDS } from "@/lib/strategy-schema";
import { type Plan } from "@/lib/plans";
import { getMochiUsage, recordMochiUsage } from "@/lib/mochi-usage";

export const maxDuration = 30;

// Model is centralized so it can be swapped in one place. Gemini Flash keeps the
// per-message cost very low, which (with the per-plan token budgets) is what
// keeps running Mochi cheap.
function chatModel() {
  return google("gemini-1.5-flash");
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

// Pure Monte Carlo of an account's equity over N trades. Returns percentile
// outcomes, the probability of a >50% drawdown ("ruin"), and one sample path
// the client renders as a chart.
function monteCarlo(a: {
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

export async function POST(req: Request) {
  const { messages }: { messages: { id: string; role: string; content: string }[] } = await req.json();
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, plan: true } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Cost guard: enforce the plan's rolling token budget before doing any work.
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
- If a request is ambiguous or missing a detail you genuinely need (e.g. which account, what win rate to assume), ask ONE short clarifying question first instead of guessing.
- For ANY arithmetic, call the calculate tool. Never do mental math.
- For projections, "what are my odds", risk-of-ruin, or "what if" questions, call runMonteCarlo and then briefly interpret the result (the app renders the chart, so don't dump the raw numbers).
- For performance or bot questions, call getPerformance / getBotStatus to use the user's REAL data. Never invent numbers.
- To change strategy settings, call updateStrategyParams with values inside the allowed ranges; the user approves before anything is applied.

Allowed parameters for updateStrategyParams: ${boundsHelp}`;

  const result = streamText({
    model: chatModel(),
    messages: messages.map((m) => ({ role: m.role, content: m.content }) as any),
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
        description: "Get the user's REAL trading performance over the last 7 days (win rate, net P/L, trade count).",
        parameters: z.object({}),
        execute: (async () => {
          const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const trades = await prisma.trade.findMany({
            where: { account: { userId: user.id }, status: "CLOSED", closedAt: { gte: since } },
            select: { netPnl: true },
          });
          const count = trades.length;
          const wins = trades.filter((t) => Number(t.netPnl ?? 0) > 0).length;
          const pnl = trades.reduce((s, t) => s + Number(t.netPnl ?? 0), 0);
          return {
            trades: count,
            winRate: count ? `${Math.round((wins / count) * 100)}%` : "N/A",
            netPnl: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
          };
        }) as any,
      }),
      getBotStatus: tool({
        description: "Check the user's REAL bots: how many exist, how many are running, open positions, and each bot's strategy.",
        parameters: z.object({}),
        execute: (async () => {
          const bots = await prisma.bot.findMany({
            where: { account: { userId: user.id } },
            include: { account: { select: { nickname: true } }, strategy: { select: { name: true } } },
          });
          const openPositions = await prisma.trade.count({ where: { account: { userId: user.id }, status: "OPEN" } });
          return {
            bots: bots.length,
            running: bots.filter((b) => b.status === "RUNNING").length,
            openPositions,
            detail: bots.map((b) => ({ account: b.account?.nickname ?? "Unassigned", status: b.status, strategy: b.strategy.name })),
          };
        }) as any,
      }),
      calculate: tool({
        description: "Evaluate a basic arithmetic expression precisely. Use for ALL math (position sizing, R multiples, percentages).",
        parameters: z.object({ expression: z.string().describe("A math expression, e.g. (10000*0.01)/15") }),
        execute: async ({ expression }) => {
          const expr = expression.trim();
          // Only digits, operators, parentheses, decimals, exponents and spaces.
          if (!/^[-+*/%.()0-9eE\s]+$/.test(expr) || expr.length > 200) {
            return { error: "Only basic arithmetic is supported." };
          }
          try {
            const fn = new Function(`"use strict"; return (${expr});`);
            const value = fn();
            if (typeof value !== "number" || !Number.isFinite(value)) return { error: "Could not evaluate that." };
            return { expression: expr, result: round(value, 6) };
          } catch {
            return { error: "Invalid expression." };
          }
        },
      }),
      runMonteCarlo: tool({
        description: "Simulate an account's equity over many trades to show the range of outcomes and the risk of a large drawdown. Returns percentiles and a sample equity path for charting.",
        parameters: z.object({
          startingBalance: z.number().optional().describe("Starting balance, default 10000"),
          riskPct: z.number().describe("Percent of balance risked per trade, e.g. 1"),
          winRate: z.number().describe("Win probability as a percent, e.g. 55"),
          rewardRisk: z.number().describe("Reward to risk multiple, e.g. 2"),
          trades: z.number().optional().describe("Number of trades to simulate, default 100"),
          simulations: z.number().optional().describe("Number of simulated paths, default 500"),
        }),
        execute: async (args) => monteCarlo(args),
      }),
      updateStrategyParams: tool({
        description: "Propose an update to the user's trading strategy parameters. The user must accept or decline.",
        // No execute: human-in-the-loop. Stays input-available until the client
        // supplies the result via addToolResult after the user accepts/declines.
        parameters: z.object({
          riskPct: z.number().optional().describe("Risk percentage per trade"),
          takeProfit: z.number().optional().describe("Take profit multiplier"),
          stopLoss: z.number().optional().describe("Stop loss multiplier"),
          maxDrawdown: z.number().optional().describe("Maximum drawdown allowed"),
        }),
      }),
    },
  });

  return result.toDataStreamResponse();
}
