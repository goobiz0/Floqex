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

// import { Ratelimit } from "@upstash/ratelimit";
// import { Redis } from "@upstash/redis";
// const ratelimit = new Ratelimit({
//   redis: Redis.fromEnv(),
//   limiter: Ratelimit.slidingWindow(10, "10 s"),
// });

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
  // const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  // const { success } = await ratelimit.limit(ip);
  // if (!success) return new Response("Rate limit exceeded", { status: 429 });

  const { messages } = await req.json();
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const systemPrompt = `You are Mochi, an expert trading copilot.
You help the user manage their trading bots and analyze performance.
Use the tools provided to fetch performance data, check bot status, or propose strategy updates.
Always be professional and concise.

Available parameters for the updateStrategyParams tool:
${boundsHelp}`;

  const result = await streamText({
    model: chatModel(),
    messages,
    system: systemPrompt,
    tools: {
      getPerformance: tool({
        description: "Get the user's trading performance over the last 7 days.",
        parameters: z.object({}),
        execute: async (_args) => {
          // In a real app, query the database. Mocking for now.
          return { winRate: "68%", pnl: "+$1,240.50", trades: 45 };
        },
      }),
      getBotStatus: tool({
        description: "Check if the bot engine is running and its current status.",
        parameters: z.object({}),
        execute: async (_args) => {
          // In a real app, query the bot state. Mocking for now.
          return { status: "running", activePositions: 2, strategy: "ORB" };
        },
      }),
      updateStrategyParams: tool({
        description: "Propose an update to the user's trading strategy parameters. The user must accept or decline.",
        parameters: z.object({
          riskPct: z.number().optional().describe("Risk percentage per trade"),
          takeProfit: z.number().optional().describe("Take profit multiplier"),
          stopLoss: z.number().optional().describe("Stop loss multiplier"),
          maxDrawdown: z.number().optional().describe("Maximum drawdown allowed"),
        }),
        execute: async (args) => {
          // This tool execution handles the *proposal*, 
          // the client handles acceptance and calls the server action.
          return { proposed: args, status: "pending_user_approval" };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
