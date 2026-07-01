// Pure parameter-optimization sweep and Monte Carlo, layered on the existing
// backtest. No randomness leaks into the UI: the Monte Carlo uses a seeded PRNG
// so the same trade set always yields the same bands (an honest, reproducible
// estimate, not a flickering fabricated number).

import { backtestStrategy, type Bar, type BacktestResult } from "./backtest";

const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type Objective =
  | "return"
  | "profitFactor"
  | "drawdown"
  | "winRate"
  | "expectancy"
  | "consistency"
  | "quality";

export type SweepDirection = "LONG" | "SHORT" | "BOTH";

export type SweepParams = {
  rrTarget: number;
  stopLossPct: number;
  trendFilter: boolean;
  direction: SweepDirection;
};

export type SweepRow = {
  params: SweepParams;
  totalReturnPct: number;
  winRate: number;
  maxDrawdownPct: number;
  profitFactor: number | null;
  trades: number;
  /** Mean realised R per trade. The truest measure of edge. */
  expectancy: number;
  /** Per-trade Sharpe (mean/stdev of R): how consistent, not just how big. */
  consistency: number;
  /** 0-100 composite quality, sample-size discounted. Powers the recommendation. */
  score: number;
  stabilityScore?: number;
};

// Bounded grids that stay inside the schema's safe ranges (rr 1-5, stop derived
// as a percent of price). We now also sweep the directional bias — a real edge
// often lives on one side of the tape, and forcing a single hard-wired direction
// hid that. riskPct is intentionally left to the user: it scales exposure, it
// doesn't change the edge, so we optimise the edge and let the trader size it.
const RR_GRID = [1, 1.5, 2, 2.5, 3, 4, 5];
const STOP_GRID = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];
const TREND_GRID = [false, true];
const DIRECTION_GRID: SweepDirection[] = ["BOTH", "LONG", "SHORT"];
const MIN_TRADES = 5;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Mean and per-trade Sharpe (mean / population stdev) of realised R multiples. */
function expectancyAndConsistency(tradeReturns: number[]): { expectancy: number; consistency: number } {
  const n = tradeReturns.length;
  if (n === 0) return { expectancy: 0, consistency: 0 };
  const mean = tradeReturns.reduce((a, b) => a + b, 0) / n;
  const variance = tradeReturns.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
  const stdev = Math.sqrt(variance);
  return { expectancy: mean, consistency: stdev > 0 ? mean / stdev : 0 };
}

/**
 * Composite 0-100 quality score. It rewards a positive edge (expectancy),
 * paying customers (profit factor), consistency and win rate, penalises
 * drawdown, then discounts the whole thing when the sample is thin — a stellar
 * result over 6 trades is worth less than a solid one over 60. This is what the
 * UI ranks by default and uses to flag the recommended settings.
 */
function qualityScore(row: Omit<SweepRow, "score">): number {
  const pf = row.profitFactor ?? 3; // no losers: treat as strong, capped at 3
  const pfScore = clamp((Math.min(pf, 3) / 3) * 100, 0, 100);
  const expScore = clamp(((row.expectancy + 0.5) / 1.5) * 100, 0, 100); // -0.5R→0, +1R→100
  const ddScore = clamp(100 - row.maxDrawdownPct * 2, 0, 100); // 0%→100, 50%→0
  const wrScore = clamp(row.winRate, 0, 100);
  const consistencyScore = clamp(((row.consistency + 0.2) / 0.8) * 100, 0, 100);
  const confidence = clamp(row.trades / 40, 0, 1); // full weight by ~40 trades
  const base =
    0.3 * expScore + 0.25 * pfScore + 0.2 * ddScore + 0.15 * consistencyScore + 0.1 * wrScore;
  return Math.round(base * (0.6 + 0.4 * confidence));
}

function scoreFor(row: SweepRow, objective: Objective): number {
  switch (objective) {
    case "return":
      return row.totalReturnPct;
    case "profitFactor":
      // null means no losing trades (undefined PF) — the strongest possible result.
      return row.profitFactor ?? Infinity;
    case "winRate":
      return row.winRate;
    case "drawdown":
      // Lower drawdown is better, so negate; tie-break toward higher return.
      return -row.maxDrawdownPct + row.totalReturnPct / 1000;
    case "expectancy":
      return row.expectancy;
    case "consistency":
      return row.consistency;
    case "quality":
      return row.score;
  }
}

/**
 * Run the backtest across a bounded grid of parameter combinations — reward:risk,
 * stop distance, the trend filter, and now the directional bias — and return the
 * top results for the chosen objective. Every row carries a full metric set
 * (expectancy, consistency, a composite quality score) so the ranking is honest
 * and the trade-offs are visible. Only combinations with enough trades to be
 * meaningful are ranked.
 */
export function optimizeStrategy(
  bars: Bar[],
  base: { riskPct?: number; direction?: SweepDirection; trailingStopPct?: number; atrStopMultiple?: number },
  objective: Objective,
  topN = 6,
): SweepRow[] {
  // First pass: full grid of returns, keyed by index so we can look up neighbours.
  const grid: (number | null)[][][][] = RR_GRID.map(() =>
    STOP_GRID.map(() => TREND_GRID.map(() => DIRECTION_GRID.map(() => null))),
  );
  type Raw = { ri: number; si: number; ti: number; di: number; r: BacktestResult };
  const raws: Raw[] = [];
  for (let ri = 0; ri < RR_GRID.length; ri++) {
    for (let si = 0; si < STOP_GRID.length; si++) {
      for (let ti = 0; ti < TREND_GRID.length; ti++) {
        for (let di = 0; di < DIRECTION_GRID.length; di++) {
          if (base.direction && base.direction !== DIRECTION_GRID[di]) continue;
          const r = backtestStrategy(bars, {
            riskPct: base.riskPct,
            rrTarget: RR_GRID[ri],
            stopLossPct: STOP_GRID[si],
            trendFilter: TREND_GRID[ti],
            direction: DIRECTION_GRID[di],
            trailingStopPct: base.trailingStopPct,
            atrStopMultiple: base.atrStopMultiple,
          });
          grid[ri][si][ti][di] = r.trades >= MIN_TRADES ? r.totalReturnPct : null;
          if (r.trades >= MIN_TRADES) raws.push({ ri, si, ti, di, r });
        }
      }
    }
  }

  // Second pass: stability = inverse of how far a cell's return is from its
  // immediate rr/stop neighbours (same trend/direction setting). Normalised against the
  // grid's overall spread so it is comparable across instruments.
  const allReturns = raws.map((x) => x.r.totalReturnPct);
  const spread = allReturns.length ? Math.max(1, Math.max(...allReturns) - Math.min(...allReturns)) : 1;

  const rows: SweepRow[] = raws.map(({ ri, si, ti, di, r }) => {
    const neighbours: number[] = [];
    for (const [dr, ds] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = ri + dr;
      const ns = si + ds;
      const v = grid[nr]?.[ns]?.[ti]?.[di];
      if (typeof v === "number") neighbours.push(v);
    }
    let stabilityScore = 0; // default to 0 for isolated cells
    if (neighbours.length) {
      const avgGap =
        neighbours.reduce((acc, v) => acc + Math.abs(v - r.totalReturnPct), 0) / neighbours.length;
      stabilityScore = clamp(1 - avgGap / spread, 0, 1);
    }
    const { expectancy, consistency } = expectancyAndConsistency(r.tradeReturns);
    const partial: Omit<SweepRow, "score"> = {
      params: { rrTarget: RR_GRID[ri], stopLossPct: STOP_GRID[si], trendFilter: TREND_GRID[ti], direction: DIRECTION_GRID[di] },
      totalReturnPct: r.totalReturnPct,
      winRate: r.winRate,
      maxDrawdownPct: r.maxDrawdownPct,
      profitFactor: r.profitFactor,
      trades: r.trades,
      expectancy,
      consistency,
      stabilityScore: Math.round(stabilityScore * 100) / 100,
    };
    return { ...partial, score: qualityScore(partial) };
  });

  return rows.sort((a, b) => scoreFor(b, objective) - scoreFor(a, objective)).slice(0, topN);
}

// ---- Monte Carlo (seeded, reproducible) ----------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MonteCarloResult = {
  runs: number;
  p5ReturnPct: number;
  p50ReturnPct: number;
  p95ReturnPct: number;
  medianMaxDrawdownPct: number;
  riskOfRuinPct: number; // share of runs that lost >= 50% at any point
  samplePaths: number[][]; // up to 20 seeded equity paths in DOLLARS on a $10,000 base
  finalsHistogram: { x0: number; x1: number; count: number }[]; // ~24 bins over final balances
  probProfitPct: number; // % of runs whose final dollar balance > 10000
};

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
};

/**
 * Bootstrap the realised per-trade R outcomes to estimate the spread of equity
 * paths. Each run resamples the same number of trades with replacement and
 * compounds them at the given per-trade risk fraction. Seeded so the bands are
 * stable across renders.
 */
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

export function monteCarlo(
  tradeReturns: number[],
  riskPct: number,
  runs = 500,
  seed = 1337,
): MonteCarloResult | null {
  const n = tradeReturns.length;
  if (n < 5) return null;
  const rand = mulberry32(seed);
  const riskFraction = Math.min(0.02, Math.max(0.001, riskPct / 100));
  const BASE = 10000;

  const finals: number[] = [];
  const finalsDollar: number[] = [];
  const drawdowns: number[] = [];
  let ruin = 0;
  let profitCount = 0;

  const maxSamplePaths = 20;
  const sampleEvery = Math.max(1, Math.floor(runs / maxSamplePaths));
  const samplePaths: number[][] = [];

  for (let run = 0; run < runs; run++) {
    let equity = 1;
    let peak = 1;
    let maxDd = 0;
    let ruined = false;
    const keep = run % sampleEvery === 0 && samplePaths.length < maxSamplePaths;
    const path: number[] = keep ? [BASE] : [];

    for (let i = 0; i < n; i++) {
      const r = tradeReturns[Math.floor(rand() * n)];
      equity *= 1 + r * riskFraction;
      if (equity <= 0) {
        ruined = true;
        equity = 0.0001;
      }
      peak = Math.max(peak, equity);
      maxDd = Math.max(maxDd, peak > 0 ? (peak - equity) / peak : 0);
      if (keep) path.push(Math.round(equity * BASE));
    }
    const finalDollar = Math.round(equity * BASE);
    finals.push((equity - 1) * 100);
    finalsDollar.push(finalDollar);
    drawdowns.push(maxDd * 100);
    if (ruined || maxDd >= 0.5) ruin++;
    if (finalDollar > BASE) profitCount++;
    if (keep) samplePaths.push(path);
  }

  finals.sort((a, b) => a - b);
  drawdowns.sort((a, b) => a - b);

  return {
    runs,
    p5ReturnPct: percentile(finals, 5),
    p50ReturnPct: percentile(finals, 50),
    p95ReturnPct: percentile(finals, 95),
    medianMaxDrawdownPct: percentile(drawdowns, 50),
    riskOfRuinPct: (ruin / runs) * 100,
    samplePaths,
    finalsHistogram: buildHistogram(finalsDollar, 24),
    probProfitPct: (profitCount / runs) * 100,
  };
}
