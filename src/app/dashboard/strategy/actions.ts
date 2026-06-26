"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { summaryMetrics } from "@/lib/metrics";
import { parseStrategyParams, coerceStrategyParams, applyRawParam, type StrategyParams } from "@/lib/strategy-schema";
import type { Prisma } from "@prisma/client";
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

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
  const tradeData = account.trades.map((t) => ({
    direction: t.direction,
    entryPrice: Number(t.entryPrice),
    exitPrice: Number(t.exitPrice),
    netPnl: Number(t.netPnl),
    rMultiple: Number(t.rMultiple)
  }));

  // 2. Determine an adjustment based on metrics using Gemini
  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-pro'),
      system: 'You are an expert quantitative trading bot optimizer. Analyze the provided recent trades. Identify inefficiencies (e.g., getting stopped out too early, taking profits too soon). Suggest exactly ONE parameter adjustment to improve the win rate or R-multiple. The parameter key must be one of: "riskPct", "rrTarget", "trailingStopPct". Give a plain-English reasoning, a projected win rate delta (e.g. +4.5), and your confidence level out of 100.',
      prompt: `Recent trades: ${JSON.stringify(tradeData)}`,
      schema: z.object({
        parameterLabel: z.string().describe("Human readable parameter name (e.g. 'Reward to risk target')"),
        paramKey: z.enum(["riskPct", "rrTarget", "trailingStopPct"]).describe("The exact schema key to change"),
        oldValue: z.string().describe("The estimated current value based on trades"),
        newValue: z.string().describe("The recommended new value as a string"),
        reasoning: z.string().describe("Plain English explanation of why this change is needed based on the trades"),
        winRateDelta: z.number().describe("Projected change in win rate (e.g., 2.5 for +2.5%)"),
        confidence: z.number().describe("Confidence level from 0 to 100")
      })
    });

    // 3. Create a pending adjustment
    await prisma.botAdjustment.create({
      data: {
        botId: account.bot.id,
        strategyId: account.bot.strategyId,
        parameter: object.parameterLabel,
        paramKey: object.paramKey,
        oldValue: object.oldValue,
        newValue: object.newValue,
        source: "BOT",
        status: "PENDING",
        reasoning: object.reasoning,
        sampleSize: account.trades.length,
        winRateDelta: object.winRateDelta,
        confidence: object.confidence
      }
    });
  } catch (e) {
    console.error("Failed to generate AI optimization:", e);
    return { ok: false, error: "Failed to generate AI optimization." };
  }

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}

export async function saveStrategy(params: StrategyParams, accountId?: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const parsed = parseStrategyParams(params);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      accounts: { orderBy: { createdAt: "asc" }, include: { bot: true } },
      strategies: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!user) return { ok: false, error: "User not found" };

  // Target the account actually being edited (the strategy lab passes its
  // accountId), not just the first account — otherwise tuning one bot's
  // strategy could silently overwrite another's.
  const account = accountId ? user.accounts.find((a) => a.id === accountId) : user.accounts[0];
  const bot = account?.bot ?? user.accounts[0]?.bot ?? null;
  const strategyId = bot ? bot.strategyId : user.strategies[0]?.id;

  if (!strategyId) return { ok: false, error: "Strategy not found" };

  await prisma.strategy.update({
    where: { id: strategyId },
    data: { params: parsed.params as unknown as Prisma.InputJsonValue },
  });

  // A running bot reads its strategy fresh on every tick, so the change takes
  // effect immediately. Surface that in the live feed so the user can see it.
  if (bot && bot.status === "RUNNING") {
    await prisma.agentEvent.create({
      data: {
        botId: bot.id,
        accountId: bot.accountId,
        kind: "ADJUST",
        message: "Strategy parameters updated. The running bot will apply the new settings on its next check.",
      },
    });
  }

  revalidatePath("/dashboard/strategy");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function approveSuggestion(id: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const suggestion = await prisma.botAdjustment.findUnique({
    where: { id },
    include: { strategy: true },
  });

  if (!suggestion || suggestion.status !== "PENDING") {
    return { ok: false, error: "Suggestion not found or already processed" };
  }

  const currentParams = coerceStrategyParams(suggestion.strategy.params);
  const result = applyRawParam(currentParams, suggestion.paramKey, suggestion.newValue);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await prisma.$transaction([
    prisma.strategy.update({
      where: { id: suggestion.strategyId },
      data: { params: result.params as unknown as Prisma.InputJsonValue },
    }),
    prisma.botAdjustment.update({
      where: { id },
      data: { status: "APPLIED" },
    }),
  ]);

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}

export async function rejectSuggestion(id: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const suggestion = await prisma.botAdjustment.findUnique({ where: { id } });
  if (!suggestion || suggestion.status !== "PENDING") {
    return { ok: false, error: "Suggestion not found or already processed" };
  }

  await prisma.botAdjustment.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}

export async function deleteStrategy(strategyId: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: { user: true, bots: true },
  });

  if (!strategy || strategy.user.clerkId !== userId) {
    return { ok: false, error: "Strategy not found" };
  }

  // Delete bots first since there is no cascade from Strategy -> Bot
  await prisma.$transaction([
    prisma.bot.deleteMany({ where: { strategyId } }),
    prisma.strategy.delete({ where: { id: strategyId } }),
  ]);

  revalidatePath("/dashboard/strategy");
  revalidatePath("/dashboard");
  return { ok: true };
}
