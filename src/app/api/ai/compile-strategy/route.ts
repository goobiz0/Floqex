import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const { object } = await generateObject({
      model: google('gemini-1.5-pro'),
      system: 'You are an expert quantitative trading strategist. You convert natural language descriptions of trading strategies into a strict JSON Abstract Syntax Tree (AST) that our trading engine can execute. Our engine supports the following indicators: price, sma50, dayHigh, dayLow. It also supports stopLossPct (how far away to place the stop loss in percentage terms, e.g. 0.5) and targetRatio (reward-to-risk ratio, e.g. 2 for 2R).',
      prompt,
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
  } catch (error: any) {
    console.error("Failed to compile strategy:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
