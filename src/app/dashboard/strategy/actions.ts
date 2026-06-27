"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { summaryMetrics } from "@/lib/metrics";
import { parseStrategyParams, coerceStrategyParams, applyRawParam, DEFAULT_PARAMS, type StrategyParams } from "@/lib/strategy-schema";
import { parseCustomConfig } from "@/lib/custom-strategy";
import { PLANS, type Plan } from "@/lib/plans";
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

/**
 * Create a brand-new strategy for the signed-in user with safe default
 * parameters. Returns the new strategy id so the caller can deep-link into the
 * tuning view. This is what the "New Strategy" button on the hub builds.
 */
export async function createStrategy(name: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false, error: "Give your strategy a name." };
  if (trimmed.length > 60) return { ok: false, error: "Keep the name under 60 characters." };

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, plan: true, _count: { select: { strategies: true } } },
  });
  if (!user) return { ok: false, error: "User not found" };

  const planConfig = PLANS[user.plan as Plan];
  if (user._count.strategies >= planConfig.strategyLimit) {
    return { ok: false, error: `Your ${planConfig.name} plan is limited to ${planConfig.strategyLimit} strategy(s).` };
  }

  const strategy = await prisma.strategy.create({
    data: {
      userId: user.id,
      name: trimmed,
      kind: "ORB",
      params: DEFAULT_PARAMS as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/strategy");
  return { ok: true, id: strategy.id };
}

/**
 * Create a strategy from the advanced "New strategy" flow: either a template
 * (ORB or a no-code custom signal) or a strategy the user authored themselves
 * (custom signal builder or live JavaScript). Validates the risk bounds AND the
 * custom-signal contract server-side so a crafted request can never widen the
 * engine's safety envelope, then persists a botless strategy the user can attach
 * to an account later. Returns the new id for deep-linking.
 */
export async function createStrategyAdvanced(input: {
  name: string;
  kind: "ORB" | "CUSTOM";
  params: Record<string, unknown>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const trimmed = (input?.name ?? "").trim();
  if (!trimmed) return { ok: false, error: "Give your strategy a name." };
  if (trimmed.length > 60) return { ok: false, error: "Keep the name under 60 characters." };

  const kind = input.kind === "CUSTOM" ? "CUSTOM" : "ORB";

  // Validate the risk parameters against their hard bounds for both kinds.
  const risk = parseStrategyParams(input.params ?? {});
  if (!risk.ok) return { ok: false, error: risk.error };

  let params: Record<string, unknown> = { ...risk.params };

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, plan: true, _count: { select: { strategies: true } } },
  });
  if (!user) return { ok: false, error: "User not found" };

  if (kind === "CUSTOM") {
    const rawParams = input.params as Record<string, unknown>;
    // Server-side pro language gate (defense in depth) before any transpilation.
    if (
      rawParams.mode === "CODE" &&
      rawParams.language !== "javascript" &&
      user.plan === "FREE"
    ) {
      return { ok: false, error: "Python, Pine Script and TradingView strategies require a paid plan." };
    }

    // Validate the entry logic (builder groups or live code) and instruments.
    const custom = parseCustomConfig(input.params ?? {});
    if (!custom.ok) return { ok: false, error: custom.error };
    params = {
      ...risk.params,
      instruments: custom.instruments,
      instrument: custom.instruments[0],
      ...custom.config,
    };
  }

  const planConfig = PLANS[user.plan as Plan];
  if (user._count.strategies >= planConfig.strategyLimit) {
    return { ok: false, error: `Your ${planConfig.name} plan is limited to ${planConfig.strategyLimit} strategy(s).` };
  }

  // Generate a webhook secret for CUSTOM CODE strategies so the TradingView
  // webhook bridge can authenticate incoming alerts without a migration.
  if (
    kind === "CUSTOM" &&
    (params as Record<string, unknown>).mode === "CODE"
  ) {
    (params as Record<string, unknown>).tvWebhookSecret = crypto.randomUUID();
  }

  const strategy = await prisma.strategy.create({
    data: {
      userId: user.id,
      name: trimmed,
      kind,
      params: params as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/strategy");
  return { ok: true, id: strategy.id };
}

export async function saveStrategy(params: StrategyParams, accountId?: string, strategyId?: string) {
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
  const bot = account?.bot ?? (accountId ? null : user.accounts[0]?.bot) ?? null;
  // An explicit strategyId (a botless strategy opened from the hub) wins, then
  // the edited bot's strategy, then the user's first strategy as a fallback.
  const explicit = strategyId
    ? user.strategies.find((s) => s.id === strategyId)?.id
    : undefined;
  const targetStrategyId = explicit ?? (bot ? bot.strategyId : user.strategies[0]?.id);

  if (!targetStrategyId) return { ok: false, error: "Strategy not found" };

  await prisma.strategy.update({
    where: { id: targetStrategyId },
    data: { params: parsed.params as unknown as Prisma.InputJsonValue },
  });

  // A running bot reads its strategy fresh on every tick, so the change takes
  // effect immediately. Only surface it when the strategy we just saved is
  // actually the one this bot runs (a botless strategy edited from the hub must
  // not claim an unrelated bot picked it up).
  if (bot && bot.accountId && bot.status === "RUNNING" && bot.strategyId === targetStrategyId) {
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
