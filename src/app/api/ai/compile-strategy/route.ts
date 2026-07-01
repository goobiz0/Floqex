import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { prisma } from '@/lib/db';

const CompileStrategySchema = z.object({
  prompt: z.string().min(5).max(2000),
}).strict();

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const success = await checkRateLimit(`compile_strategy_${userId}`, 5, "1 m");
    if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parsedBody = CompileStrategySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
    }

    const { prompt } = parsedBody.data;

    const dbUser = await prisma.user.findUnique({ where: { clerkId: userId }, select: { email: true } });
    const distinctId = dbUser?.email ?? userId;

    const { object } = await generateObject({
      model: google('gemini-1.5-pro'),
      system: 'You are an expert quantitative trading strategist. You convert natural language descriptions of trading strategies into a strict JSON Abstract Syntax Tree (AST) that our trading engine can execute. Our engine supports the following indicators: price, sma50, dayHigh, dayLow. It also supports stopLossPct (how far away to place the stop loss in percentage terms, e.g. 0.5) and targetRatio (reward-to-risk ratio, e.g. 2 for 2R).',
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "compile-strategy",
        metadata: {
          posthog_distinct_id: distinctId,
        },
      },
      schema: z.object({
        name: z.string().describe("A concise, catchy name for the strategy."),
        direction: z.enum(["LONG", "SHORT", "BOTH"]).describe("Whether the strategy enters long, short, or both directions based on the conditions."),
        conditions: z.array(
          z.object({
            indicator: z.enum(["price", "sma50", "dayHigh", "dayLow"]),
            operator: z.enum([">", "<", ">=", "<=", "=="]),
            value: z.union([z.enum(["price", "sma50", "dayHigh", "dayLow"]), z.number()]),
          })
        ).describe("The logical conditions that must all be true to enter the trade."),
        stopLossPct: z.number().describe("The stop loss percentage distance, e.g., 0.5 for 0.5%."),
        targetRatio: z.number().describe("The reward to risk ratio target, e.g. 2.0 for 2R."),
      }),
    });

    return NextResponse.json({ ast: object });
  } catch (error: unknown) {
    console.error("Failed to compile strategy:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
