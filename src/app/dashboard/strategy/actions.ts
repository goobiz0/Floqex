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
import { getIntradayBars, getRealMarketData, type Interval } from "@/lib/engine/market-data";
import { runValidation, DEFAULT_COSTS, type ValidationReport } from "@/lib/engine/validation";
import { evaluateOrbStrategy, evaluateCustomStrategy } from "@/lib/engine/signal-generator";
import { instrumentsFromParams } from "@/lib/custom-strategy";
import { isInstrumentTradeable } from "@/lib/market";

const INTERVAL_MINUTES: Record<Interval, number> = { "1m": 1, "5m": 5, "15m": 15, "1h": 60 };

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ValidationResponse =
  | {
      ok: true;
      locked: boolean;
      report: ValidationReport;
      /** Change in Edge Score vs the previous validation of this strategy, if any.
       *  Negative means the edge has decayed since it was last checked. */
      edgeDelta?: number | null;
      /** True when 5m history was too thin and we fell back to a coarser interval. */
      intervalAdjusted?: boolean;
    }
  | { ok: false; error: string };

const MIN_VALIDATION_BARS = 50;

// Coarser-interval fallback chain: if the requested interval can't supply enough
// real bars, step up to one that can rather than failing outright.
const INTERVAL_FALLBACK: Record<Interval, Interval[]> = {
  "1m": ["1m", "5m", "15m"],
  "5m": ["5m", "15m"],
  "15m": ["15m", "1h"],
  "1h": ["1h"],
};

function lookbackFor(interval: Interval): number {
  return interval === "1m" ? 7 : interval === "1h" ? 360 : 58;
}

/**
 * Run the rigorous Validation Lab over REAL intraday bars for a strategy's
 * instrument. The quick Sandbox preview (daily bars, client-side) stays free;
 * the deep suite (walk-forward out-of-sample, Monte Carlo, robustness sweep,
 * Edge Score) is a PRO+ capability, matching the plan catalogue. We still return
 * a real report for lower tiers (so the value is visible) but flag it `locked`
 * so the UI can gate the advanced panels behind an upgrade.
 */
export async function runStrategyValidation(input: {
  strategyId?: string;
  instrument?: string;
  interval?: Interval;
  riskPct?: number;
  rrTarget?: number;
  stopLossPct?: number;
  trendFilter?: boolean;
  direction?: "LONG" | "SHORT" | "BOTH";
  minRange?: number;
  maxRange?: number;
  trailingStopPct?: number;
}): Promise<ValidationResponse> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, plan: true } });
  if (!user) return { ok: false, error: "User not found" };

  // Resolve params from the saved strategy when an id is given, overlaid with any
  // live tweaks from the client so the trader can validate before saving.
  let saved: Record<string, unknown> = {};
  if (input.strategyId) {
    const strat = await prisma.strategy.findFirst({ where: { id: input.strategyId, userId: user.id }, select: { params: true } });
    saved = (strat?.params as Record<string, unknown>) ?? {};
  }

  const instrument = (input.instrument || (typeof saved.instrument === "string" ? saved.instrument : "") || "NQ").trim();
  const requestedInterval: Interval = input.interval ?? "5m";
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

  // Adaptive interval selection: try the requested granularity, then step up to
  // coarser bars until we have enough real history to validate honestly.
  let interval: Interval = requestedInterval;
  let bars: Awaited<ReturnType<typeof getIntradayBars>>["bars"] = [];
  let source = "Yahoo Finance";
  let intervalAdjusted = false;
  for (const candidate of INTERVAL_FALLBACK[requestedInterval]) {
    const res = await getIntradayBars(instrument, candidate, lookbackFor(candidate));
    if (res.bars.length >= MIN_VALIDATION_BARS) {
      interval = candidate;
      bars = res.bars;
      source = res.source;
      intervalAdjusted = candidate !== requestedInterval;
      break;
    }
    // Keep the best (last) attempt so the error message is accurate.
    bars = res.bars;
    source = res.source;
    interval = candidate;
  }

  if (bars.length < MIN_VALIDATION_BARS) {
    return {
      ok: false,
      error: `Not enough intraday history for ${instrument} to validate reliably (need ${MIN_VALIDATION_BARS}+ bars, found ${bars.length}). Try a different instrument or a longer timeframe.`,
    };
  }

  const report = runValidation(
    bars,
    {
      riskPct: num(input.riskPct ?? saved.riskPct, 1),
      rrTarget: num(input.rrTarget ?? saved.rrTarget, 2),
      stopLossPct: num(input.stopLossPct ?? saved.stopLossPct, 0.5),
      trendFilter: Boolean(input.trendFilter ?? saved.trendFilter),
      direction: input.direction ?? (saved.direction as "LONG" | "SHORT" | "BOTH") ?? "BOTH",
      minRange: num(input.minRange ?? saved.minRange, 0.1),
      maxRange: num(input.maxRange ?? saved.maxRange, 5),
      trailingStopPct: num(input.trailingStopPct ?? saved.trailingStopPct, 0),
    },
    DEFAULT_COSTS,
    { interval, intervalMinutes: INTERVAL_MINUTES[interval], source, seed: 7 },
  );

  // Edge-decay tracking: compare this score to the last persisted one so the UI
  // can flag a strategy whose edge is fading before it's wired to live capital.
  const previousScore = typeof saved.edgeScore === "number" ? saved.edgeScore : null;
  const edgeDelta = previousScore != null ? round2(report.edge.score - previousScore) : null;

  // Persist the latest Edge Score on the strategy params so the Go-Live flow can
  // warn when a Fragile strategy is wired to a live account (no migration: it
  // rides in the existing params JSON).
  if (input.strategyId) {
    try {
      await prisma.strategy.update({
        where: { id: input.strategyId },
        data: {
          params: {
            ...saved,
            edgeScore: report.edge.score,
            edgeVerdict: report.edge.verdict,
            edgeExpectancyR: report.walkForward.outOfSample.expectancyR,
            edgeCheckedAt: new Date().toISOString(),
            // Carry the prior score + delta so the hub and Go-Live flow can show
            // an at-a-glance "edge improving / decaying" indicator without a
            // separate history table.
            edgePrevScore: previousScore,
            edgeDelta,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      console.error("Could not persist edge score:", e);
    }
  }

  const planConfig = PLANS[user.plan as Plan];
  const locked = !(planConfig.id === "PRO" || planConfig.id === "ELITE");
  return { ok: true, locked, report, edgeDelta, intervalAdjusted };
}

// ─────────────────────────── Live Signal Feed ───────────────────────────────
// Evaluates a strategy against live market data WITHOUT trading, so a user can
// watch their logic fire (or not) in real time before risking capital. Pure
// read: it reuses the exact same signal generators the live engine runs.

export type LiveSignalRow = {
  instrument: string;
  price: number | null;
  isOpen: boolean;
  signal: { direction: "LONG" | "SHORT"; entryPrice: number; stopPrice: number; targetPrice: number; strength?: number } | null;
  indicators: { rsi14: number | null; macd: number | null; sma50: number | null; rangePosition: number | null } | null;
  note: string;
};

export type LiveSignalsResponse =
  | { ok: true; rows: LiveSignalRow[]; asOf: string }
  | { ok: false; error: string };

export async function getLiveSignals(input: { strategyId: string }): Promise<LiveSignalsResponse> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return { ok: false, error: "User not found" };

  const strat = await prisma.strategy.findFirst({
    where: { id: input.strategyId, userId: user.id },
    select: { kind: true, params: true },
  });
  if (!strat) return { ok: false, error: "Strategy not found" };

  const params = (typeof strat.params === "string" ? JSON.parse(strat.params) : strat.params) as Record<string, unknown>;
  const instruments = instrumentsFromParams(params).slice(0, 6);

  const rows = await Promise.all(
    instruments.map(async (instrument): Promise<LiveSignalRow> => {
      const md = await getRealMarketData(instrument);
      if (!md) {
        return { instrument, price: null, isOpen: isInstrumentTradeable(instrument), signal: null, indicators: null, note: "No live price available right now." };
      }
      // Evaluate with no open trade and no guard — a pure "what would fire now".
      const signal = strat.kind === "CUSTOM"
        ? evaluateCustomStrategy(params, md, null)
        : evaluateOrbStrategy(params, md, null);
      const indicators = md.indicators
        ? { rsi14: md.indicators.rsi14, macd: md.indicators.macd, sma50: md.indicators.sma50, rangePosition: md.indicators.rangePosition }
        : { rsi14: null, macd: null, sma50: md.sma50, rangePosition: null };
      const note = signal
        ? `Setup live: ${signal.direction}${signal.strength != null ? ` (${Math.round(signal.strength * 100)}% confluence)` : ""}.`
        : !md.isOpen
          ? "Market closed. Watching for the next session."
          : strat.kind === "CUSTOM"
            ? "Conditions not all met yet. Holding flat."
            : "Price hasn't pushed to the edge of the range yet.";
      return { instrument, price: md.price, isOpen: md.isOpen, signal, indicators, note };
    }),
  );

  return { ok: true, rows, asOf: new Date().toISOString() };
}

// Engine liveness, derived from how recently the worker stamped a heartbeat on
// the user's running bots. "live" means the engine is actively ticking; "stale"
// means bots are RUNNING but no recent heartbeat (worker down or restarting).
export type EngineHealth = { status: "live" | "stale" | "idle"; lastBeatMs: number | null; runningBots: number };

export async function getEngineHealth(): Promise<EngineHealth> {
  const { userId } = await auth();
  if (!userId) return { status: "idle", lastBeatMs: null, runningBots: 0 };
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return { status: "idle", lastBeatMs: null, runningBots: 0 };

  const bots = await prisma.bot.findMany({
    where: { status: "RUNNING", account: { userId: user.id } },
    select: { lastHeartbeat: true },
  });
  if (bots.length === 0) return { status: "idle", lastBeatMs: null, runningBots: 0 };

  const latest = bots.reduce((m, b) => Math.max(m, b.lastHeartbeat ? b.lastHeartbeat.getTime() : 0), 0);
  const age = latest > 0 ? Date.now() - latest : null;
  // 30s threshold: the worker ticks every 2s and stamps each tick, so a beat
  // older than 30s means it isn't being processed.
  const status: EngineHealth["status"] = age != null && age < 30_000 ? "live" : "stale";
  return { status, lastBeatMs: age, runningBots: bots.length };
}

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

    // 4. Cleanup old adjustments (keep only the 10 most recent)
    const recent = await prisma.botAdjustment.findMany({
      where: { strategyId: account.bot.strategyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
      take: 10,
    });
    
    if (recent.length === 10) {
      await prisma.botAdjustment.deleteMany({
        where: {
          strategyId: account.bot.strategyId,
          id: { notIn: recent.map(r => r.id) }
        }
      });
    }
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

  if (kind === "CUSTOM") {
    // Validate the entry logic (builder groups or live code). Assets are chosen
    // on the bot when the strategy is deployed, so the strategy itself stays
    // asset-agnostic and carries no instrument.
    const custom = parseCustomConfig(input.params ?? {});
    if (!custom.ok) return { ok: false, error: custom.error };
    params = { ...risk.params, ...custom.config };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, plan: true, _count: { select: { strategies: true } } },
  });
  if (!user) return { ok: false, error: "User not found" };

  // Server-side pro language gate (defense in depth).
  if (
    kind === "CUSTOM" &&
    (params as Record<string, unknown>).mode === "CODE" &&
    (params as Record<string, unknown>).language !== "javascript" &&
    user.plan === "FREE"
  ) {
    return { ok: false, error: "Python, Pine Script and TradingView strategies require a paid plan." };
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

  const strategy = await prisma.strategy.findFirst({
    where: { id: strategyId, user: { clerkId: userId } },
    select: { id: true },
  });

  if (!strategy) return { ok: false, error: "Strategy not found" };

  // Delete everything that references this strategy (and its bots) explicitly and
  // in dependency order. Relying on the database's ON DELETE cascades is fragile
  // here — an environment whose foreign keys were created without the cascade (or
  // a bot that has agent events / trades) makes a bare `bot.deleteMany` throw,
  // which surfaced as a delete button that "does nothing". Deleting the children
  // ourselves inside one transaction removes that dependency, and the try/catch
  // turns any residual failure into a proper error the UI can roll back on.
  try {
    const bots = await prisma.bot.findMany({ where: { strategyId }, select: { id: true } });
    const botIds = bots.map((b) => b.id);

    await prisma.$transaction([
      // Children of the bots first.
      prisma.agentEvent.deleteMany({ where: { botId: { in: botIds } } }),
      prisma.trade.deleteMany({ where: { botId: { in: botIds } } }),
      prisma.botAdjustment.deleteMany({ where: { botId: { in: botIds } } }),
      // Then everything that points straight at the strategy.
      prisma.botAdjustment.deleteMany({ where: { strategyId } }),
      prisma.forwardTest.deleteMany({ where: { strategyId } }),
      prisma.bot.deleteMany({ where: { strategyId } }),
      prisma.strategy.delete({ where: { id: strategyId } }),
    ]);
  } catch (e) {
    console.error("deleteStrategy error:", e);
    return { ok: false, error: "Could not delete the strategy. Please try again." };
  }

  revalidatePath("/dashboard/strategy");
  return { ok: true };
}
