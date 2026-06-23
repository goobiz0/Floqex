import { streamText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";
import {
  coerceStrategyParams,
  PARAM_BOUNDS,
} from "@/lib/strategy-schema";

export const maxDuration = 30;

// Model is centralized so it can be swapped in one place. (Anthropic would need
// the AI SDK core upgraded from v3 to a version whose provider matches.)
function chatModel() {
  return google("gemini-1.5-flash");
}

const boundsHelp = (Object.keys(PARAM_BOUNDS) as (keyof typeof PARAM_BOUNDS)[])
  .map((k) => `${k} ${PARAM_BOUNDS[k].min}-${PARAM_BOUNDS[k].max}${PARAM_BOUNDS[k].suffix ?? ""}`)
  .join(", ");

export async function POST(req: Request) {
  const { messages } = await req.json();
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { strategies: { orderBy: { createdAt: "asc" } }, accounts: { include: { bot: true } } },
  });
  
  if (!user) {
    return new Response(
      JSON.stringify({ 
        role: "assistant", 
        content: "Your account is still being provisioned. Please complete onboarding first." 
      }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const plan = PLANS[user.plan as Plan] ?? PLANS.FREE;
  const strategy = user.strategies[0] ?? null;
  const params = strategy ? coerceStrategyParams(strategy.params) : null;
  const firstName = user.firstName ?? "there";

  const context = [
    `User: ${firstName} on the ${plan.name} plan (${user.accounts.length}/${plan.accountLimit === Infinity ? "unlimited" : plan.accountLimit} accounts, live trading ${plan.liveTrading ? "enabled" : "locked"}).`,
    params
      ? `Current ORB strategy params: ${JSON.stringify(params)}.`
      : `No strategy configured yet.`,
  ].join("\n");

  try {
    const result = await streamText({
      model: chatModel(),
      system: `You are Mochi, the in-app assistant for Floqex, a platform where an automated bot trades an Opening Range Breakout (ORB) strategy on the user's behalf inside hard risk guardrails.

How Floqex works, so you can answer accurately:
- The bot trades the first 15-minute opening range of a session, going long on a breakout above the range high and short below the low, with the stop on the opposite side of the range and a profit target at a reward-to-risk multiple.
- Sessions: Asia (Gold, Tokyo morning) and New York (Gold, NQ, ES). Paper accounts use real market data with simulated fills, so results are real, not random.
- Risk is enforced server-side and cannot be bypassed: per-trade risk, a daily-loss circuit breaker, and trade caps. You may help the user tune these within their safe bounds, never outside them.

Voice: warm, clear, and genuinely useful. Talk like a sharp trading desk colleague, not a hype bot. Be concise. Do not use emoji. Never invent numbers; when the user asks about their performance, accounts, or bot, call the relevant tool and answer from the real result. If a value is outside the allowed bounds (${boundsHelp}), explain the limit instead of forcing it.

${context}`,
      messages,
      tools: {
        getPerformance: tool({
          description: "Get the user's real closed-trade performance: trade count, win rate, net P&L, and profit factor.",
          parameters: z.object({}),
          execute: async () => {
            const trades = await prisma.trade.findMany({
              where: { account: { userId: user.id }, status: "CLOSED" },
              select: { netPnl: true },
            });
            if (trades.length === 0) {
              return { tradeCount: 0, note: "No closed trades yet. The bot trades during the next session window." };
            }
            const pnls = trades.map((t) => Number(t.netPnl ?? 0));
            const wins = pnls.filter((p) => p > 0);
            const grossWin = wins.reduce((a, b) => a + b, 0);
            const grossLoss = Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0));
            return {
              tradeCount: trades.length,
              winRatePct: Math.round((wins.length / trades.length) * 1000) / 10,
              netPnl: Math.round(pnls.reduce((a, b) => a + b, 0) * 100) / 100,
              profitFactor: grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : null,
            };
          },
        }),
        getBotStatus: tool({
          description: "Get the live status of the user's accounts and bots (status, mode, balance, last heartbeat).",
          parameters: z.object({}),
          execute: async () => {
            const accounts = await prisma.account.findMany({
              where: { userId: user.id },
              select: {
                nickname: true,
                mode: true,
                balance: true,
                bot: { select: { status: true, lastHeartbeat: true } },
              },
            });
            return accounts.map((a) => ({
              account: a.nickname,
              mode: a.mode,
              balance: Number(a.balance),
              botStatus: a.bot?.status ?? "NONE",
              lastHeartbeat: a.bot?.lastHeartbeat?.toISOString() ?? null,
            }));
          },
        }),
        updateStrategyParams: tool({
          description:
            "Propose changes to the user's ORB strategy parameters. Pass only the fields to change. Values are validated against safe bounds; out-of-range requests are rejected. The user must manually accept this proposal in the UI.",
          parameters: z.object({
            riskPct: z.number().optional(),
            dailyLoss: z.number().optional(),
            maxTrades: z.number().optional(),
            rrTarget: z.number().optional(),
            rangeMinutes: z.number().optional(),
            minRange: z.number().optional(),
            maxRange: z.number().optional(),
            trendFilter: z.boolean().optional(),
            reEntry: z.boolean().optional(),
          }),
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Mochi Chat Error:", error);
    
    // Fallback response for unconfigured OpenAI or DB issues. 
    // We mock a stream response by returning a text stream so the useChat hook doesn't crash.
    const errorMessage = error?.message?.includes("API key") 
      ? "My neural link to Gemini is currently offline (Missing GOOGLE_GENERATIVE_AI_API_KEY)." 
      : "I encountered a system error processing your request. Please check my configuration.";
      
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`0:"${errorMessage}"\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}
