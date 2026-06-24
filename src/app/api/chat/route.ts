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

  const lastMessage = messages[messages.length - 1];
  
  // Simulated Local AI Engine
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      if (lastMessage.role === "tool") {
        enqueue(`0:"I've processed that for you. Anything else?"\\n`);
      } else {
        const content = lastMessage.content.toLowerCase();
        
        if (content.includes("performance") || content.includes("doing so far")) {
          enqueue(`9:{"toolCallId":"call_perf","toolName":"getPerformance","args":{}}\\n`);
        } else if (content.includes("bot running") || content.includes("status")) {
          enqueue(`9:{"toolCallId":"call_status","toolName":"getBotStatus","args":{}}\\n`);
        } else if (content.includes("lower my risk")) {
          enqueue(`0:"I can help with that. Here is a proposal to lower your risk to 0.5%:"\\n`);
          enqueue(`9:{"toolCallId":"call_risk","toolName":"updateStrategyParams","args":{"riskPct":0.5}}\\n`);
        } else if (content.includes("explain the orb")) {
          enqueue(`0:"The Opening Range Breakout (ORB) strategy marks the high and low of the first 15 minutes of the trading session. If price breaks above the high, it buys. If it breaks below the low, it shorts. It sets strict stop losses on the opposite side of the breakout."\\n`);
        } else {
          enqueue(`0:"I'm Mochi, running in local free mode! I don't need a Gemini key right now. You can ask me to check your performance, bot status, or adjust your risk."\\n`);
        }
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
