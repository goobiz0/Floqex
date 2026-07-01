"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { summaryMetrics, byInstrument, bySession, byWeekday, streaks, rDistribution, type TradeRow } from "@/lib/metrics";
import { parseStrategyParams, coerceStrategyParams, applyRawParam, rawParamValue, PARAM_BOUNDS, PARAM_LABELS, DEFAULT_PARAMS, type StrategyParams } from "@/lib/strategy-schema";
import { parseCustomConfig } from "@/lib/custom-strategy";
import { PLANS, hasAiAnalysis, AI_ANALYSIS_MIN_PLAN, type Plan } from "@/lib/plans";
import { mochiModel, normalizeTokenUsage } from "@/lib/mochi";
import { getMochiUsage, recordMochiUsage } from "@/lib/mochi-usage";
import { checkRateLimit } from "@/lib/ratelimit";
import type { Prisma } from "@prisma/client";
import { generateObject } from 'ai';
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

// ───────────────────────── AI Strategy Analysis ─────────────────────────────
// Pro-tier, Mochi-powered analysis of a bot's real closed trades. It reads the
// current strategy parameters AND the realised performance, then proposes ONE
// small, conservative parameter change. Every knob here is deliberately cautious
// so a single reading can never over-correct the bot into a worse place:
//   • Pro entitlement gate (defence-in-depth, mirrors the UI).
//   • Per-user rate limits (burst + hourly) so it can't be spammed.
//   • Shared Mochi token budget — the same meter the chat copilot draws from.
//   • A minimum sample size so we never tune on noise.
//   • A hard per-parameter step clamp + schema-bound re-validation so the
//     proposed value is always a nudge inside the safe envelope, never a leap.

/** Parameters AI Analysis is allowed to touch, and how far it may move each one
 *  in a single reading (absolute step, in the parameter's own units). */
const AI_MAX_STEP = {
  riskPct: 0.25,        // percentage points of account risk
  rrTarget: 0.5,        // R
  trailingStopPct: 0.5, // percentage points
  stopLossPct: 0.25,    // percentage points
  maxTrades: 2,         // trades per day
} as const;

type AiParamKey = keyof typeof AI_MAX_STEP;
const AI_ALLOWED_KEYS = Object.keys(AI_MAX_STEP) as [AiParamKey, ...AiParamKey[]];

/** Rounding precision per key so the proposal reads cleanly. */
const AI_DECIMALS: Record<AiParamKey, number> = {
  riskPct: 2, rrTarget: 1, trailingStopPct: 2, stopLossPct: 2, maxTrades: 0,
};

/** Safe absolute bounds for each tunable key (mirrors the strategy schema). */
const AI_BOUNDS: Record<AiParamKey, { min: number; max: number }> = {
  riskPct: { min: PARAM_BOUNDS.riskPct.min, max: PARAM_BOUNDS.riskPct.max },
  rrTarget: { min: PARAM_BOUNDS.rrTarget.min, max: PARAM_BOUNDS.rrTarget.max },
  trailingStopPct: { min: PARAM_BOUNDS.trailingStopPct.min, max: PARAM_BOUNDS.trailingStopPct.max },
  stopLossPct: { min: 0.05, max: 20 },
  maxTrades: { min: PARAM_BOUNDS.maxTrades.min, max: PARAM_BOUNDS.maxTrades.max },
};

/** Fewer than this many closed trades and there isn't enough signal to tune on. */
const AI_MIN_TRADES = 10;

export type AiAnalysisAdjustment = {
  id: string;
  parameter: string;
  paramKey: string;
  oldValue: string;
  newValue: string;
  reasoning: string | null;
  sampleSize: number | null;
  winRateDelta: number | null;
  confidence: number | null;
};

export type AiAnalysisResult =
  | { ok: true; adjustment: AiAnalysisAdjustment }
  | { ok: true; adjustment: null; note: string }
  | { ok: false; error: string; upgrade?: boolean };

// Minimal DB trade → metrics TradeRow mapper (numbers, not Decimals).
type AiTrade = {
  id: string; instrument: string; direction: string; session: string; status: string;
  entryPrice: unknown; exitPrice: unknown; stopPrice: unknown; targetPrice: unknown;
  sizeUnits: unknown; netPnl: unknown; grossPnl: unknown; rMultiple: unknown;
  mfe: unknown; mae: unknown; openedAt: Date; closedAt: Date | null;
};
const n = (d: unknown): number => Number(d as { toString(): string });
const nOrNull = (d: unknown): number | null => (d == null ? null : Number(d as { toString(): string }));
function aiToRow(t: AiTrade): TradeRow {
  return {
    id: t.id, instrument: t.instrument,
    direction: t.direction as TradeRow["direction"],
    session: t.session as TradeRow["session"],
    status: t.status as TradeRow["status"],
    entryPrice: n(t.entryPrice), exitPrice: nOrNull(t.exitPrice),
    stopPrice: n(t.stopPrice), targetPrice: n(t.targetPrice), sizeUnits: n(t.sizeUnits),
    netPnl: nOrNull(t.netPnl), grossPnl: nOrNull(t.grossPnl), rMultiple: nOrNull(t.rMultiple),
    openedAt: t.openedAt.toISOString(), closedAt: t.closedAt ? t.closedAt.toISOString() : null,
    narrative: null, screenshotUrl: null,
  };
}

export async function runAiOptimization(accountId: string): Promise<AiAnalysisResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, plan: true },
  });
  if (!user) return { ok: false, error: "User not found" };
  const plan = (user.plan as Plan) || "FREE";

  // 1) Pro entitlement gate (defence in depth; the UI also gates this).
  if (!hasAiAnalysis(plan)) {
    return {
      ok: false,
      upgrade: true,
      error: `AI Analysis is a ${PLANS[AI_ANALYSIS_MIN_PLAN].name} feature. Upgrade to let Mochi analyse this bot and propose an improvement.`,
    };
  }

  // 2) Anti-abuse rate limiting, per user: a burst guard plus an hourly cap.
  //    Degrades to allow when Upstash isn't configured (see checkRateLimit).
  if (!(await checkRateLimit(`ai-analysis-burst:${user.id}`, 1, "30 s"))) {
    return { ok: false, error: "You just ran an analysis. Give Mochi a moment before running another." };
  }
  if (!(await checkRateLimit(`ai-analysis:${user.id}`, 8, "1 h"))) {
    return { ok: false, error: "You've reached the hourly limit for AI Analysis. Please try again a little later." };
  }

  // 3) Shared Mochi token budget — the same meter the chat copilot spends against.
  const usage = await getMochiUsage(user.id, plan);
  if (usage.blocked) {
    const which = usage.window === "week" ? "weekly" : "5-hour";
    return {
      ok: false,
      upgrade: true,
      error: `You've reached your Mochi ${which} token limit. AI Analysis draws from the same budget. It resets as the window rolls forward, or upgrade for a larger allowance.`,
    };
  }

  // 4) Ownership + data. NOTE: account.userId is the internal User.id, not the
  //    Clerk id — comparing it to the Clerk id (the original bug) always failed,
  //    so the feature never worked. Scope the query by the resolved user.id.
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: user.id },
    include: {
      bot: { include: { strategy: true } },
      trades: {
        where: { status: "CLOSED" },
        orderBy: { closedAt: "desc" },
        take: 120,
        select: {
          id: true, instrument: true, direction: true, session: true, status: true,
          entryPrice: true, exitPrice: true, stopPrice: true, targetPrice: true, sizeUnits: true,
          netPnl: true, grossPnl: true, rMultiple: true, mfe: true, mae: true,
          openedAt: true, closedAt: true,
        },
      },
    },
  });
  if (!account || !account.bot) {
    return { ok: false, error: "No bot is attached to this account yet. Attach a bot before running AI Analysis." };
  }
  const bot = account.bot;

  const rows = account.trades.map((t) => aiToRow(t as AiTrade));
  const m = summaryMetrics(rows);
  if (m.count < AI_MIN_TRADES) {
    return {
      ok: false,
      error: `Mochi needs at least ${AI_MIN_TRADES} closed trades on this bot to analyse reliably. It has ${m.count} so far. Let it trade a little more first.`,
    };
  }

  const currentParams = coerceStrategyParams(bot.strategy.params);
  const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;

  // Excursion context: high MFE with a low win rate = exiting winners too early /
  // stops too tight; MAE clustered near -1R = stops sit right where noise reaches.
  const mfeVals = account.trades.map((t) => nOrNull(t.mfe)).filter((v): v is number => v != null);
  const maeVals = account.trades.map((t) => nOrNull(t.mae)).filter((v): v is number => v != null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const instrumentPnl = byInstrument(rows);
  const topInstruments = Object.entries(instrumentPnl)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5)
    .map(([k, v]) => ({ instrument: k, netPnl: round(v, 2) }));

  const context = {
    strategy: {
      kind: bot.strategy.kind,
      current: {
        riskPct: round(currentParams.riskPct, 2),
        rrTarget: round(currentParams.rrTarget, 2),
        trailingStopPct: round(currentParams.trailingStopPct, 2),
        stopLossPct: round(typeof currentParams.stopLossPct === "number" ? currentParams.stopLossPct : 0.5, 2),
        maxTrades: currentParams.maxTrades,
        trendFilter: currentParams.trendFilter,
        direction: typeof currentParams.direction === "string" ? currentParams.direction : "BOTH",
      },
    },
    performance: {
      closedTrades: m.count,
      winRatePct: round(m.winRate, 1),
      expectancyR: round(m.expectancy, 2),
      profitFactor: Number.isFinite(m.profitFactor) ? round(m.profitFactor, 2) : null,
      avgWin: round(m.avgWin, 2),
      avgLoss: round(m.avgLoss, 2),
      netPnl: round(m.total, 2),
      avgMfeR: mfeVals.length ? round(avg(mfeVals)!, 2) : null,
      avgMaeR: maeVals.length ? round(avg(maeVals)!, 2) : null,
      rDistribution: rDistribution(rows),
      streaks: streaks(rows),
      bySession: bySession(rows),
      byWeekday: byWeekday(rows),
      byInstrument: topInstruments,
    },
    recentTrades: rows.slice(0, 12).map((r) => ({
      instrument: r.instrument, direction: r.direction, session: r.session,
      rMultiple: r.rMultiple, netPnl: r.netPnl,
    })),
  };

  const boundsHelp = (Object.keys(AI_MAX_STEP) as AiParamKey[])
    .map((k) => `${k} (${AI_BOUNDS[k].min}-${AI_BOUNDS[k].max}, max move ±${AI_MAX_STEP[k]} per reading)`)
    .join("; ");

  const system = `You are Mochi's strategy analyst inside the Floqex trading app.
You are given a bot's CURRENT strategy parameters and its REAL closed-trade performance.
Propose exactly ONE small, conservative parameter change that is most likely to improve
the strategy's expectancy or win rate WITHOUT over-correcting.

Hard rules:
- Choose exactly one paramKey from: ${AI_ALLOWED_KEYS.join(", ")}.
- Allowed ranges and the MAXIMUM you may move a parameter in a single reading: ${boundsHelp}.
- Never exceed that per-reading step. One careful nudge, not a leap. The engine also clamps you.
- Ground the change in the data provided (win rate, expectancy, R-distribution, MFE/MAE, sessions).
  Examples: high average MFE with a low win rate suggests taking profit too early (lower rrTarget or
  add/loosen a trailing stop); MAE clustered near -1R suggests stops are too tight (widen stopLossPct);
  a strong positive edge with modest risk may justify a tiny riskPct increase; frequent late-day losses
  suggest lowering maxTrades.
- Prefer risk-reducing or neutral changes when the evidence is thin. Do not chase returns by raising risk
  unless the edge is clearly positive on a solid sample.
- If nothing is clearly worth changing, pick the smallest safe nudge and say so honestly, with low confidence.
- winRateDelta is your projected percentage-point change in win rate (e.g. 2.5). Keep it realistic (|delta| <= 15).
- confidence is 0-100 and MUST reflect the sample size and how clear the signal is.
- newValue is the exact numeric value you propose for the chosen paramKey (a number, in the parameter's units).
Be precise and do not invent numbers that aren't supported by the data.`;

  try {
    const { object, usage: modelUsage } = await generateObject({
      model: mochiModel(),
      system,
      prompt: JSON.stringify(context),
      schema: z.object({
        parameterLabel: z.string().describe("Human readable parameter name"),
        paramKey: z.enum(AI_ALLOWED_KEYS).describe("The exact schema key to change"),
        newValue: z.number().describe("The proposed numeric value for the chosen paramKey"),
        reasoning: z.string().describe("Plain-English, data-grounded explanation of the change"),
        winRateDelta: z.number().describe("Projected change in win rate in percentage points, e.g. 2.5"),
        confidence: z.number().min(0).max(100).describe("Confidence 0-100, reflecting sample size and signal clarity"),
      }),
      maxRetries: 1,
    });

    // Record the spend against the SAME Mochi token budget as the chat copilot.
    await recordMochiUsage(user.id, normalizeTokenUsage(modelUsage));

    const key = object.paramKey as AiParamKey;
    const current = Number(currentParams[key]);
    const safeCurrent = Number.isFinite(current) ? current : (DEFAULT_PARAMS[key] as number);

    // Over-correction guard: clamp the proposal to a small step from the current
    // value AND inside the parameter's hard bounds, then round. This is what
    // guarantees a reading can only nudge the bot, never yank it.
    const step = AI_MAX_STEP[key];
    const bounds = AI_BOUNDS[key];
    let proposed = Number(object.newValue);
    if (!Number.isFinite(proposed)) {
      return { ok: false, error: "Mochi returned an invalid value. Please try again." };
    }
    proposed = Math.min(bounds.max, Math.max(bounds.min, proposed));
    proposed = Math.min(safeCurrent + step, Math.max(safeCurrent - step, proposed));
    const dp = AI_DECIMALS[key];
    proposed = Math.round(proposed * 10 ** dp) / 10 ** dp;

    // Re-validate through the full strategy schema so the stored value can never
    // sit outside the engine's safety envelope, then read back the clamped value.
    const applied = applyRawParam(currentParams, key, String(proposed));
    if (!applied.ok) {
      return { ok: false, error: "Mochi proposed a value outside safe bounds. Please try again." };
    }
    const finalValue = Number(applied.params[key]);

    // After clamping, the nudge may collapse to the current value. That's a valid,
    // honest outcome: the settings already fit recent performance.
    if (Math.abs(finalValue - safeCurrent) < 10 ** -dp / 2) {
      return {
        ok: true,
        adjustment: null,
        note: "Mochi reviewed this bot's recent performance and found no change worth making right now. Your current settings look well matched to how it's been trading.",
      };
    }

    // Honesty caps: confidence is bounded by sample size; win-rate projection is bounded.
    const sampleCap = m.count >= 60 ? 90 : m.count >= 30 ? 75 : 55;
    const confidence = Math.max(1, Math.min(Math.round(object.confidence), sampleCap));
    const winRateDelta = Math.max(-15, Math.min(15, round(object.winRateDelta, 1)));

    const created = await prisma.botAdjustment.create({
      data: {
        botId: bot.id,
        strategyId: bot.strategyId,
        parameter: PARAM_LABELS[key] ?? object.parameterLabel,
        paramKey: key,
        oldValue: rawParamValue(key, safeCurrent),
        newValue: rawParamValue(key, finalValue),
        source: "BOT",
        status: "PENDING",
        reasoning: object.reasoning.slice(0, 600),
        sampleSize: m.count,
        winRateDelta,
        confidence,
      },
    });

    // Keep only the 10 most recent adjustments for this strategy.
    const recent = await prisma.botAdjustment.findMany({
      where: { strategyId: bot.strategyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
      take: 10,
    });
    if (recent.length === 10) {
      await prisma.botAdjustment.deleteMany({
        where: { strategyId: bot.strategyId, id: { notIn: recent.map((r) => r.id) } },
      });
    }

    revalidatePath("/dashboard/strategy");
    return {
      ok: true,
      adjustment: {
        id: created.id,
        parameter: created.parameter,
        paramKey: key,
        oldValue: created.oldValue,
        newValue: created.newValue,
        reasoning: created.reasoning,
        sampleSize: created.sampleSize,
        winRateDelta,
        confidence,
      },
    };
  } catch (e) {
    console.error("Failed to generate AI analysis:", e);
    return { ok: false, error: "Mochi couldn't complete the analysis. Please try again in a moment." };
  }
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
