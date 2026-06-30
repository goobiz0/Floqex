// Pure parameter-optimization sweep and Monte Carlo, layered on the existing
// backtest. No randomness leaks into the UI: the Monte Carlo uses a seeded PRNG
// so the same trade set always yields the same bands (an honest, reproducible
// estimate, not a flickering fabricated number).

import { backtestStrategy, type Bar, type BacktestResult } from "./backtest";

export type Objective = "return" | "profitFactor" | "drawdown" | "winRate" | "balanced";

export type SweepParams = { rrTarget: number; stopLossPct: number; trendFilter: boolean };

export type SweepRow = {
  params: SweepParams;
  totalReturnPct: number;
  winRate: number;
  maxDrawdownPct: number;
  profitFactor: number | null;
  trades: number;
  /** 0-1: how little performance swings when rr/stop are nudged to neighbours.
   *  A robust setting sits on a plateau (high), a lucky one on a spike (low). */
  stabilityScore: number;
};

const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Grids matched to the rigorous validation engine so the quick sweep and the
// deep Validation Lab explore the same space (rr 1-3, stops 0.3-1.5% — all
// inside the schema's safe ranges). riskPct is intentionally left to the user:
// it scales exposure, it doesn't change the edge.
const RR_GRID = [1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0];
const STOP_GRID = [0.3, 0.5, 0.6, 0.75, 1.0, 1.5];
const TREND_GRID = [false, true];
const MIN_TRADES = 5;

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
    case "balanced":
      // Multi-objective: reward return and win rate, penalise drawdown, and
      // lean toward settings that are robust to small parameter changes. The
      // weights keep all terms on a comparable 0-ish scale.
      return (
        row.totalReturnPct * 0.6 +
        row.winRate * 0.4 -
        row.maxDrawdownPct * 0.8 +
        row.stabilityScore * 25
      );
  }
}

/**
 * Run the backtest across a bounded grid of parameter combinations and return
 * the top results for the chosen objective. Only combinations with enough trades
 * to be meaningful are ranked. Each row also carries a stability score derived
 * from its grid neighbours, so a setting on a smooth plateau is preferred over
 * one perched on an isolated spike (the signature of an overfit).
 */
export function optimizeStrategy(
  bars: Bar[],
  base: { riskPct?: number; direction?: "LONG" | "SHORT" | "BOTH" },
  objective: Objective,
  topN = 5,
): SweepRow[] {
  // First pass: full grid of returns, keyed by index so we can look up neighbours.
  const grid: (number | null)[][][] = RR_GRID.map(() =>
    STOP_GRID.map(() => TREND_GRID.map(() => null)),
  );
  type Raw = { ri: number; si: number; ti: number; r: BacktestResult };
  const raws: Raw[] = [];
  for (let ri = 0; ri < RR_GRID.length; ri++) {
    for (let si = 0; si < STOP_GRID.length; si++) {
      for (let ti = 0; ti < TREND_GRID.length; ti++) {
        const r = backtestStrategy(bars, {
          riskPct: base.riskPct,
          rrTarget: RR_GRID[ri],
          stopLossPct: STOP_GRID[si],
          trendFilter: TREND_GRID[ti],
          direction: base.direction,
        });
        grid[ri][si][ti] = r.trades >= MIN_TRADES ? r.totalReturnPct : null;
        if (r.trades >= MIN_TRADES) raws.push({ ri, si, ti, r });
      }
    }
  }

  // Second pass: stability = inverse of how far a cell's return is from its
  // immediate rr/stop neighbours (same trend setting). Normalised against the
  // grid's overall spread so it is comparable across instruments.
  const allReturns = raws.map((x) => x.r.totalReturnPct);
  const spread = allReturns.length ? Math.max(1, Math.max(...allReturns) - Math.min(...allReturns)) : 1;

  const rows: SweepRow[] = raws.map(({ ri, si, ti, r }) => {
    const neighbours: number[] = [];
    for (const [dr, ds] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = ri + dr;
      const ns = si + ds;
      const v = grid[nr]?.[ns]?.[ti];
      if (typeof v === "number") neighbours.push(v);
    }
    let stabilityScore = 1;
    if (neighbours.length) {
      const avgGap =
        neighbours.reduce((acc, v) => acc + Math.abs(v - r.totalReturnPct), 0) / neighbours.length;
      stabilityScore = clampNum(1 - avgGap / spread, 0, 1);
    }
    return {
      params: { rrTarget: RR_GRID[ri], stopLossPct: STOP_GRID[si], trendFilter: TREND_GRID[ti] },
      totalReturnPct: r.totalReturnPct,
      winRate: r.winRate,
      maxDrawdownPct: r.maxDrawdownPct,
      profitFactor: r.profitFactor,
      trades: r.trades,
      stabilityScore: Math.round(stabilityScore * 100) / 100,
    };
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
