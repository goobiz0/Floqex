// Strategy Validation engine. A rigorous, honest superset of the daily-bar
// `backtest.ts` preview. It answers the one question every trader automating an
// edge must answer before risking capital: "is this real, or am I curve-fitting?"
//
// Unlike `backtest.ts` (daily bars, can't sequence intraday), this simulator
// walks INTRADAY bars in true chronological order, so an Opening Range Breakout
// is modelled the way it actually trades: build the opening range, wait for a
// break, then resolve stop/target in the order price reached them. It layers a
// realistic cost model, a walk-forward out-of-sample split, a bootstrap Monte
// Carlo over the real trade sequence, a parameter-robustness sweep, and a single
// transparent Edge Score. Everything here is pure and dependency-free (no
// network, no prisma) so it is deterministic and unit-testable.

import type { Bar } from "./backtest";
import { atr as atrOf } from "./indicators";
import { expectancy, riskOfRuinAnalytic, drawdownRecovery, mulberry32 } from "@/lib/calculators";

const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export type ValidationParams = {
  riskPct: number; // % of equity risked per trade (0.1 - 2)
  rrTarget: number; // reward : risk multiple
  stopLossPct: number; // stop distance as % of entry
  trendFilter?: boolean;
  direction?: "LONG" | "SHORT" | "BOTH";
  minRange?: number; // multiples of a ~1% reference day (skip quiet days)
  maxRange?: number; // multiples of a ~1% reference day (skip wild days)
  /** Trail the stop by this % of entry as price moves favorably. 0 disables.
   *  Mirrors the live engine's `trailingStopPct` so the backtest reflects what
   *  actually happens in production. */
  trailingStopPct?: number;
  atrStopMultiple?: number;
};

// What it costs to actually trade. Subtracted every fill so the curve matches
// live expectations rather than a frictionless fantasy.
export type CostModel = {
  commissionPerTrade: number; // flat $ per round turn
  slippageBps: number; // adverse slippage on each fill, basis points
  spreadBps: number; // half-spread paid on entry and exit, basis points
};

export const DEFAULT_COSTS: CostModel = { commissionPerTrade: 1, slippageBps: 2, spreadBps: 1 };

export type SimOptions = {
  startEquity?: number;
  intervalMinutes?: number; // bar granularity, used to size the opening range
  openingRangeMinutes?: number; // length of the opening range (default 30)
};

export type SimTrade = {
  day: string;
  direction: "LONG" | "SHORT";
  entry: number;
  exit: number;
  rMultiple: number; // net of costs, in R
  pnl: number; // net cash
  reason: "TARGET" | "STOP" | "EOD";
};

export type SimResult = {
  series: { date: string; equity: number }[];
  trades: SimTrade[];
  rSequence: number[];
  startEquity: number;
  endEquity: number;
  tradeCount: number;
  wins: number;
  winRate: number; // %
  totalReturnPct: number;
  maxDrawdownPct: number;
  profitFactor: number | null;
  expectancyR: number; // expected R per trade, net of costs
  barsCount: number;
  days: number;
};

// Simple rolling SMA over a numeric series (used for the trend gate).
function sma(values: number[], end: number, period: number): number | null {
  if (end < period) return null;
  let sum = 0;
  for (let i = end - period; i < end; i++) sum += values[i];
  return sum / period;
}

function groupByDay(bars: Bar[]): Map<string, Bar[]> {
  const map = new Map<string, Bar[]>();
  for (const b of bars) {
    const day = b.date.slice(0, 10);
    const arr = map.get(day);
    if (arr) arr.push(b);
    else map.set(day, [b]);
  }
  return map;
}

/**
 * Intraday Opening Range Breakout simulation. Walks each day's bars in order:
 * forms the opening range from the first `openingRangeMinutes`, then takes the
 * first clean break of that range and resolves the stop/target chronologically.
 * Costs are applied to every fill. Returns the equity curve, the per-trade
 * results, and the R-multiple sequence the Monte Carlo resamples.
 */
export function simulateIntraday(bars: Bar[], params: ValidationParams, costs: CostModel, opts: SimOptions = {}): SimResult {
  const START = opts.startEquity ?? 10000;
  const intervalMin = Math.max(1, opts.intervalMinutes ?? 5);
  const orMinutes = Math.max(intervalMin, opts.openingRangeMinutes ?? 30);
  const orCount = Math.max(1, Math.round(orMinutes / intervalMin));

  const riskPct = clampNum(params.riskPct ?? 1, 0.1, 2) / 100;
  const rr = clampNum(params.rrTarget ?? 2, 0.5, 10);
  const stopPct = clampNum(params.stopLossPct ?? 0.5, 0.05, 10) / 100;
  const bias = params.direction ?? "BOTH";
  const trailPct = clampNum(params.trailingStopPct ?? 0, 0, 10) / 100;
  const atrMult = clampNum(params.atrStopMultiple ?? 0, 0, 5);
  // 0.8% is a normal day for most instruments (1.0% over-filtered out real
  // sessions); used as the reference for the min/max range gates.
  const NORMAL_RANGE = 0.008;
  const minRange = params.minRange != null ? params.minRange : 0.1;
  const maxRange = params.maxRange != null ? params.maxRange : 5;
  // Honest cost model: real trading pays the spread and slippage on BOTH fills.
  const entrySlip = (costs.slippageBps + costs.spreadBps) / 10000;
  const exitSlip = (costs.slippageBps + costs.spreadBps) / 10000;

  const byDay = groupByDay(bars);
  const days = [...byDay.keys()].sort();

  // A trend reference computed from each day's closing price across days, so the
  // filter behaves like the live 20-period SMA gate without peeking intraday.
  const dailyBars = days.map((d) => {
    const arr = byDay.get(d)!;
    return {
      date: d,
      open: arr[0].open,
      high: Math.max(...arr.map((b) => b.high)),
      low: Math.min(...arr.map((b) => b.low)),
      close: arr[arr.length - 1].close,
    };
  });
  const dailyCloses = dailyBars.map((b) => b.close);

  const series: { date: string; equity: number }[] = [{ date: days[0] ?? "Start", equity: START }];
  const trades: SimTrade[] = [];
  const rSequence: number[] = [];

  let equity = START;
  let wins = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let peak = START;
  let maxDD = 0;

  for (let d = 0; d < days.length; d++) {
    const day = days[d];
    const dayBars = byDay.get(day)!;
    if (dayBars.length <= orCount) {
      series.push({ date: day, equity: round2(equity) });
      continue;
    }

    const orSlice = dayBars.slice(0, orCount);
    const orHigh = Math.max(...orSlice.map((b) => b.high));
    const orLow = Math.min(...orSlice.map((b) => b.low));
    const ref = orSlice[orSlice.length - 1].close || orHigh;
    const rangePct = ref > 0 ? (orHigh - orLow) / ref : 0;

    // Skip days whose opening range is too quiet or too wild to trade.
    if (rangePct < NORMAL_RANGE * minRange || rangePct > NORMAL_RANGE * maxRange) {
      series.push({ date: day, equity: round2(equity) });
      continue;
    }

    const trendSma = params.trendFilter ? sma(dailyCloses, d, Math.min(20, d)) : null;

    type Pos = { dir: "LONG" | "SHORT"; entry: number; stop: number; target: number; riskDist: number; size: number } | null;
    let pos: Pos = null;
    let dayClosed = false;

    for (let i = orCount; i < dayBars.length; i++) {
      const bar = dayBars[i];

      if (!pos) {
        const longBreak = bar.high >= orHigh;
        const shortBreak = bar.low <= orLow;
        let dir: "LONG" | "SHORT" | null = null;
        if (longBreak && bias !== "SHORT") dir = "LONG";
        else if (shortBreak && bias !== "LONG") dir = "SHORT";
        if (!dir) continue;

        if (trendSma != null) {
          if (dir === "LONG" && ref < trendSma) continue;
          if (dir === "SHORT" && ref > trendSma) continue;
        }

        const rawEntry = dir === "LONG" ? orHigh : orLow;
        // Adverse slippage + spread on entry (pay up to get in).
        const entry = dir === "LONG" ? rawEntry * (1 + entrySlip) : rawEntry * (1 - entrySlip);
        let riskDist = entry * stopPct;
        if (atrMult > 0 && d >= 14) {
          const atrVal = atrOf(dailyBars.slice(Math.max(0, d - 28), d), 14);
          if (atrVal != null && atrVal > 0) riskDist = atrVal * atrMult;
        }
        if (riskDist <= 0) continue;
        const stop = dir === "LONG" ? entry - riskDist : entry + riskDist;
        const target = dir === "LONG" ? entry + riskDist * rr : entry - riskDist * rr;
        const riskBudget = equity * riskPct;
        const size = riskBudget / riskDist;
        pos = { dir, entry, stop, target, riskDist, size };
        continue;
      }

      // Resolve an open position against this bar, stop-first when ambiguous.
      // The stop may have been trailed up/down by earlier bars (see below).
      const isLong = pos.dir === "LONG";
      const hitStop = isLong ? bar.low <= pos.stop : bar.high >= pos.stop;
      const hitTarget = isLong ? bar.high >= pos.target : bar.low <= pos.target;
      let exitRaw: number | null = null;
      let reason: SimTrade["reason"] | null = null;
      if (hitStop) {
        exitRaw = pos.stop;
        reason = "STOP";
      } else if (hitTarget) {
        exitRaw = pos.target;
        reason = "TARGET";
      }
      if (exitRaw == null && trailPct > 0) {
        // Not stopped or targeted this bar: ratchet the trailing stop using the
        // bar close, so the tightened level only applies from the next bar (no
        // intrabar look-ahead). Matches the live engine's TRAIL_UPDATE logic.
        const trailDist = pos.entry * trailPct;
        if (isLong) {
          const cand = bar.close - trailDist;
          if (cand > pos.stop) pos.stop = cand;
        } else {
          const cand = bar.close + trailDist;
          if (cand < pos.stop) pos.stop = cand;
        }
      }
      if (exitRaw != null && reason) {
        const exit = isLong ? exitRaw * (1 - exitSlip) : exitRaw * (1 + exitSlip);
        const pnlPerUnit = isLong ? exit - pos.entry : pos.entry - exit;
        const pnl = pnlPerUnit * pos.size - costs.commissionPerTrade;
        equity += pnl;
        const rMult = pos.riskDist > 0 ? pnl / (pos.riskDist * pos.size) : 0;
        trades.push({ day, direction: pos.dir, entry: round2(pos.entry), exit: round2(exit), rMultiple: round2(rMult), pnl: round2(pnl), reason });
        rSequence.push(rMult);
        if (pnl >= 0) {
          wins++;
          grossWin += pnl;
        } else {
          grossLoss += -pnl;
        }
        peak = Math.max(peak, equity);
        maxDD = Math.max(maxDD, peak > 0 ? (peak - equity) / peak : 0);
        pos = null;
        dayClosed = true;
        break; // one trade per day, matching the live ORB default
      }
    }

    // Mark out any position still open at the close of the day.
    if (pos && !dayClosed) {
      const last = dayBars[dayBars.length - 1].close;
      const isLong = pos.dir === "LONG";
      const exit = isLong ? last * (1 - exitSlip) : last * (1 + exitSlip);
      const pnlPerUnit = isLong ? exit - pos.entry : pos.entry - exit;
      const pnl = pnlPerUnit * pos.size - costs.commissionPerTrade;
      equity += pnl;
      const rMult = pos.riskDist > 0 ? pnl / (pos.riskDist * pos.size) : 0;
      trades.push({ day, direction: pos.dir, entry: round2(pos.entry), exit: round2(exit), rMultiple: round2(rMult), pnl: round2(pnl), reason: "EOD" });
      rSequence.push(rMult);
      if (pnl >= 0) {
        wins++;
        grossWin += pnl;
      } else {
        grossLoss += -pnl;
      }
      peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak > 0 ? (peak - equity) / peak : 0);
    }

    series.push({ date: day, equity: round2(equity) });
  }

  const tradeCount = trades.length;
  const avgWinR = (() => {
    const w = rSequence.filter((r) => r > 0);
    return w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
  })();
  const avgLossR = (() => {
    const l = rSequence.filter((r) => r < 0);
    return l.length ? Math.abs(l.reduce((a, b) => a + b, 0) / l.length) : 0;
  })();
  const winRate = tradeCount ? (wins / tradeCount) * 100 : 0;
  const exp = expectancy(winRate, avgWinR || 0, avgLossR || 0);

  return {
    series,
    trades,
    rSequence,
    startEquity: START,
    endEquity: round2(equity),
    tradeCount,
    wins,
    winRate,
    totalReturnPct: ((equity - START) / START) * 100,
    maxDrawdownPct: maxDD * 100,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? null : 0,
    expectancyR: exp.perR,
    barsCount: bars.length,
    days: days.length,
  };
}

// ───────────────────────── Walk-forward / out-of-sample ─────────────────────

export type WalkForwardResult = {
  inSample: SimResult;
  outOfSample: SimResult;
  chosenParams: ValidationParams;
  splitDay: string | null;
  /** OOS expectancy / IS expectancy. < 1 means the edge decayed unseen. */
  degradation: number;
};

// Wider grids so the optimiser and robustness sweep can find the real sweet
// spot (e.g. RR 1.2 with a 0.8% stop) instead of being forced into a corner.
const RR_GRID = [1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0];
const STOP_GRID = [0.3, 0.5, 0.6, 0.75, 1.0, 1.5];

/**
 * Optimise on the first ~60% of history, then measure the chosen parameters on
 * the held-out ~40% the optimiser never saw. The gap between in-sample and
 * out-of-sample performance is the single best tell for curve-fitting.
 */
export function walkForward(bars: Bar[], base: ValidationParams, costs: CostModel, opts: SimOptions = {}): WalkForwardResult {
  const byDay = groupByDay(bars);
  const days = [...byDay.keys()].sort();
  const splitIdx = Math.floor(days.length * 0.6);
  const splitDay = days[splitIdx] ?? null;
  const trainBars = splitDay ? bars.filter((b) => b.date.slice(0, 10) < splitDay) : bars;
  const testBars = splitDay ? bars.filter((b) => b.date.slice(0, 10) >= splitDay) : [];

  // Grid-search the train window for the best risk-adjusted expectancy.
  let best: ValidationParams = { ...base };
  let bestScore = -Infinity;
  for (const rrTarget of RR_GRID) {
    for (const stopLossPct of STOP_GRID) {
      const cand: ValidationParams = { ...base, rrTarget, stopLossPct };
      const r = simulateIntraday(trainBars, cand, costs, opts);
      if (r.tradeCount < 5) continue;
      const score = r.expectancyR * Math.sqrt(r.tradeCount); // reward edge with evidence
      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }
  }

  const inSample = simulateIntraday(trainBars, best, costs, opts);
  const outOfSample = simulateIntraday(testBars.length ? testBars : trainBars, best, costs, opts);
  const degradation = inSample.expectancyR !== 0 ? outOfSample.expectancyR / inSample.expectancyR : 0;

  return { inSample, outOfSample, chosenParams: best, splitDay, degradation };
}

// ───────────────────────── Bootstrap Monte Carlo ───────────────────────────

export type MonteCarloBands = {
  steps: { trade: number; p5: number; p25: number; p50: number; p75: number; p95: number }[];
  finalP5: number;
  finalP50: number;
  finalP95: number;
  probProfit: number; // % of paths above start
  riskOfRuin: number; // % of paths that breach the ruin drawdown
  riskOfRuinAnalytic: number; // closed-form sanity check
  samplePaths: number[][];
  finalsHistogram: { x0: number; x1: number; count: number }[];
};

function buildHistogram(values: number[], binCount = 24): { x0: number; x1: number; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0) {
    return [{ x0: min - 1, x1: max + 1, count: values.length }];
  }
  const bw = span / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    x0: min + i * bw,
    x1: min + (i + 1) * bw,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / bw));
    bins[idx].count++;
  }
  return bins;
}

function percentileAsc(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = clampNum(p, 0, 1) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

/**
 * Resample the REAL per-trade R sequence with replacement to build a fan of
 * plausible equity futures. This captures the strategy's actual win/loss
 * distribution (fat tails included), which a parametric model would miss. Seeded
 * via `mulberry32` so the chart is reproducible.
 */
export function bootstrapMonteCarlo(
  rSequence: number[],
  opts: { startEquity?: number; riskPct?: number; trades?: number; sims?: number; ruinPct?: number; seed?: number } = {},
): MonteCarloBands {
  const start = opts.startEquity ?? 10000;
  const riskFrac = clampNum((opts.riskPct ?? 1) / 100, 0, 1);
  const steps = clampNum(Math.floor(opts.trades ?? Math.max(rSequence.length, 20)), 1, 2000);
  const sims = clampNum(Math.floor(opts.sims ?? 1000), 1, 5000);
  const ruinThreshold = clampNum((opts.ruinPct ?? 50) / 100, 0.01, 1);
  const rand = mulberry32((opts.seed ?? 7) >>> 0 || 1);

  if (rSequence.length === 0) {
    return { steps: [], finalP5: start, finalP50: start, finalP95: start, probProfit: 0, riskOfRuin: 0, riskOfRuinAnalytic: 100, samplePaths: [], finalsHistogram: [] };
  }

  // equityAtStep[step] holds every sim's equity at that step, for percentiles.
  const equityAtStep: number[][] = Array.from({ length: steps + 1 }, () => new Array(sims));
  const finals: number[] = new Array(sims);
  let ruinCount = 0;
  let profitCount = 0;
  const maxSamplePaths = Math.min(20, sims);
  const sampleEvery = Math.max(1, Math.floor(sims / maxSamplePaths));
  const samplePaths: number[][] = [];

  for (let s = 0; s < sims; s++) {
    let equity = start;
    let peak = start;
    let ruined = false;
    const keep = s % sampleEvery === 0 && samplePaths.length < maxSamplePaths;
    const path: number[] = keep ? [equity] : [];
    equityAtStep[0][s] = equity;
    for (let t = 1; t <= steps; t++) {
      const r = rSequence[Math.floor(rand() * rSequence.length)];
      equity += equity * riskFrac * r;
      if (equity < 0) equity = 0;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? (peak - equity) / peak : 0;
      if (!ruined && dd >= ruinThreshold) ruined = true;
      equityAtStep[t][s] = equity;
      if (keep) path.push(round2(equity));
    }
    finals[s] = equity;
    if (ruined) ruinCount++;
    if (equity > start) profitCount++;
    if (keep) samplePaths.push(path);
  }

  const bandSteps = equityAtStep.map((col, t) => {
    const sorted = [...col].sort((a, b) => a - b);
    return {
      trade: t,
      p5: round2(percentileAsc(sorted, 0.05)),
      p25: round2(percentileAsc(sorted, 0.25)),
      p50: round2(percentileAsc(sorted, 0.5)),
      p75: round2(percentileAsc(sorted, 0.75)),
      p95: round2(percentileAsc(sorted, 0.95)),
    };
  });
  const sortedFinals = [...finals].sort((a, b) => a - b);

  // Closed-form ruin as a cross-check, derived from the observed win rate / RR.
  const winRate = (rSequence.filter((r) => r > 0).length / rSequence.length) * 100;
  const avgWin = (() => {
    const w = rSequence.filter((r) => r > 0);
    return w.length ? w.reduce((a, b) => a + b, 0) / w.length : 1;
  })();
  const roiUnits = riskFrac > 0 ? 1 / riskFrac : 100;
  const roirAnalytic = riskOfRuinAnalytic(winRate, avgWin, Math.min(roiUnits, 100));

  return {
    steps: bandSteps,
    finalP5: round2(percentileAsc(sortedFinals, 0.05)),
    finalP50: round2(percentileAsc(sortedFinals, 0.5)),
    finalP95: round2(percentileAsc(sortedFinals, 0.95)),
    probProfit: round2((profitCount / sims) * 100),
    riskOfRuin: round2((ruinCount / sims) * 100),
    riskOfRuinAnalytic: round2(roirAnalytic),
    samplePaths,
    finalsHistogram: buildHistogram(finals, 24),
  };
}

// ───────────────────────── Parameter robustness ────────────────────────────

export type RobustnessGrid = {
  rrAxis: number[];
  stopAxis: number[];
  cells: { rr: number; stop: number; totalReturnPct: number; expectancyR: number; trades: number }[];
  /** Fraction of cells that are profitable. A robust edge is green across the grid. */
  positiveFraction: number;
};

/**
 * Sweep the two most sensitive parameters and record performance at every
 * combination. A genuine edge stays positive across a neighbourhood; a single
 * bright cell surrounded by red is the signature of an overfit.
 */
export function robustnessGrid(bars: Bar[], base: ValidationParams, costs: CostModel, opts: SimOptions = {}): RobustnessGrid {
  const rrAxis = RR_GRID;
  const stopAxis = STOP_GRID;
  const cells: RobustnessGrid["cells"] = [];
  let positive = 0;
  for (const stop of stopAxis) {
    for (const rr of rrAxis) {
      const r = simulateIntraday(bars, { ...base, rrTarget: rr, stopLossPct: stop }, costs, opts);
      cells.push({ rr, stop, totalReturnPct: round2(r.totalReturnPct), expectancyR: round2(r.expectancyR), trades: r.tradeCount });
      if (r.totalReturnPct > 0) positive++;
    }
  }
  return { rrAxis, stopAxis, cells, positiveFraction: cells.length ? positive / cells.length : 0 };
}

// ───────────────────────── Edge Score ──────────────────────────────────────

export type EdgeVerdict = "Fragile" | "Promising" | "Robust";

export type EdgeFactor = { label: string; detail: string; points: number; max: number };

export type EdgeScore = {
  score: number; // 0 - 100
  verdict: EdgeVerdict;
  factors: EdgeFactor[];
};

/**
 * A transparent 0-100 score. Never a black box: every component and its weight
 * is returned so the trader sees exactly why the verdict is what it is.
 */
export function computeEdgeScore(wf: WalkForwardResult, mc: MonteCarloBands, grid: RobustnessGrid): EdgeScore {
  const oos = wf.outOfSample;
  const factors: EdgeFactor[] = [];

  // 1. Out-of-sample expectancy (30) — does the edge survive on unseen data.
  // A real intraday edge is ~0.15R per trade; 0.3R was too harsh a bar and made
  // genuinely profitable strategies score only 33-66% on this component.
  const expPts = clampNum(oos.expectancyR / 0.15, 0, 1) * 30;
  factors.push({ label: "Out-of-sample edge", detail: `${oos.expectancyR >= 0 ? "+" : ""}${oos.expectancyR.toFixed(2)}R per trade on held-out data`, points: round2(expPts), max: 30 });

  // 2. Profit factor (15). A PF of 1.5 is a strong, near-max result; the old
  // `/1` divisor only credited it half.
  const pf = oos.profitFactor ?? (oos.totalReturnPct > 0 ? 2 : 0);
  const pfPts = clampNum((pf - 1) / 0.5, 0, 1) * 15;
  factors.push({ label: "Profit factor", detail: pf ? `${pf.toFixed(2)} gross win / loss` : "no losing trades sampled", points: round2(pfPts), max: 15 });

  // 3. Low risk of ruin (20) — inverse of Monte Carlo ruin probability.
  const ruinPts = clampNum(1 - mc.riskOfRuin / 100, 0, 1) * 20;
  factors.push({ label: "Survivability", detail: `${mc.riskOfRuin.toFixed(0)}% of simulated futures hit ruin`, points: round2(ruinPts), max: 20 });

  // 4. Robustness (20) — share of the parameter grid that stays profitable.
  const robPts = clampNum(grid.positiveFraction, 0, 1) * 20;
  factors.push({ label: "Parameter robustness", detail: `${Math.round(grid.positiveFraction * 100)}% of nearby settings profitable`, points: round2(robPts), max: 20 });

  // 5. Sample size (15) — confidence scales with evidence. 25 out-of-sample
  // trades is enough for significance at this granularity (40 was overly strict
  // given the held-out window is only ~40% of the history).
  const samplePts = clampNum(oos.tradeCount / 25, 0, 1) * 15;
  factors.push({ label: "Sample size", detail: `${oos.tradeCount} out-of-sample trades`, points: round2(samplePts), max: 15 });

  // Degradation guard: heavy in-sample-only edges are penalised.
  let score = factors.reduce((a, f) => a + f.points, 0);
  if (wf.degradation < 0.4 && wf.inSample.expectancyR > 0) {
    score *= 0.7;
    factors.push({ label: "Overfit penalty", detail: `out-of-sample kept only ${Math.round(Math.max(0, wf.degradation) * 100)}% of in-sample edge`, points: 0, max: 0 });
  }
  score = clampNum(round2(score), 0, 100);

  const verdict: EdgeVerdict = score >= 70 ? "Robust" : score >= 45 ? "Promising" : "Fragile";
  return { score, verdict, factors };
}

// ───────────────────────── Orchestration ───────────────────────────────────

export type ValidationReport = {
  dataWindow: { interval: string; bars: number; days: number; source: string };
  full: SimResult;
  walkForward: WalkForwardResult;
  monteCarlo: MonteCarloBands;
  robustness: RobustnessGrid;
  edge: EdgeScore;
  recoveryNeededPct: number; // gain required to climb out of the OOS max drawdown
};

/**
 * Run the whole validation suite over real intraday bars and return one report
 * the UI renders verbatim. Deterministic for a given seed and input.
 */
export function runValidation(
  bars: Bar[],
  params: ValidationParams,
  costs: CostModel = DEFAULT_COSTS,
  opts: SimOptions & { interval?: string; source?: string; seed?: number } = {},
): ValidationReport {
  const full = simulateIntraday(bars, params, costs, opts);
  const wf = walkForward(bars, params, costs, opts);
  const mc = bootstrapMonteCarlo(wf.outOfSample.rSequence.length ? wf.outOfSample.rSequence : full.rSequence, {
    startEquity: opts.startEquity ?? 10000,
    riskPct: params.riskPct,
    trades: Math.max(full.tradeCount, 40),
    sims: 1000,
    ruinPct: 50,
    seed: opts.seed ?? 7,
  });
  const grid = robustnessGrid(bars, params, costs, opts);
  const edge = computeEdgeScore(wf, mc, grid);

  return {
    dataWindow: {
      interval: opts.interval ?? `${opts.intervalMinutes ?? 5}m`,
      bars: bars.length,
      days: full.days,
      source: opts.source ?? "Yahoo Finance",
    },
    full,
    walkForward: wf,
    monteCarlo: mc,
    robustness: grid,
    edge,
    recoveryNeededPct: round2(drawdownRecovery(wf.outOfSample.maxDrawdownPct)),
  };
}
