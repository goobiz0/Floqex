// Pure parameter-optimization sweep and Monte Carlo, layered on the existing
// backtest. No randomness leaks into the UI: the Monte Carlo uses a seeded PRNG
// so the same trade set always yields the same bands (an honest, reproducible
// estimate, not a flickering fabricated number).

import { backtestStrategy, type Bar, type BacktestResult } from "./backtest";

export type Objective = "return" | "profitFactor" | "drawdown" | "winRate";

export type SweepParams = { rrTarget: number; stopLossPct: number; trendFilter: boolean };

export type SweepRow = {
  params: SweepParams;
  totalReturnPct: number;
  winRate: number;
  maxDrawdownPct: number;
  profitFactor: number | null;
  trades: number;
};

// Bounded grids that stay inside the schema's safe ranges (rr 1-5, stop derived
// as a percent of price). riskPct is intentionally left to the user: it scales
// exposure, it doesn't change the edge, so we optimise the edge and let the
// trader size it.
const RR_GRID = [1, 1.5, 2, 2.5, 3, 4];
const STOP_GRID = [0.25, 0.5, 0.75, 1, 1.5, 2];
const TREND_GRID = [false, true];
const MIN_TRADES = 5;

function scoreFor(row: SweepRow, objective: Objective): number {
  switch (objective) {
    case "return":
      return row.totalReturnPct;
    case "profitFactor":
      return row.profitFactor ?? 0;
    case "winRate":
      return row.winRate;
    case "drawdown":
      // Lower drawdown is better, so negate; tie-break toward higher return.
      return -row.maxDrawdownPct + row.totalReturnPct / 1000;
  }
}

/**
 * Run the backtest across a bounded grid of parameter combinations and return
 * the top results for the chosen objective. Only combinations with enough trades
 * to be meaningful are ranked.
 */
export function optimizeStrategy(
  bars: Bar[],
  base: { riskPct?: number; direction?: "LONG" | "SHORT" | "BOTH" },
  objective: Objective,
  topN = 5,
): SweepRow[] {
  const rows: SweepRow[] = [];
  for (const rrTarget of RR_GRID) {
    for (const stopLossPct of STOP_GRID) {
      for (const trendFilter of TREND_GRID) {
        const r: BacktestResult = backtestStrategy(bars, {
          riskPct: base.riskPct,
          rrTarget,
          stopLossPct,
          trendFilter,
          direction: base.direction,
        });
        if (r.trades < MIN_TRADES) continue;
        rows.push({
          params: { rrTarget, stopLossPct, trendFilter },
          totalReturnPct: r.totalReturnPct,
          winRate: r.winRate,
          maxDrawdownPct: r.maxDrawdownPct,
          profitFactor: r.profitFactor,
          trades: r.trades,
        });
      }
    }
  }
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

  const finals: number[] = [];
  const drawdowns: number[] = [];
  let ruin = 0;

  for (let run = 0; run < runs; run++) {
    let equity = 1;
    let peak = 1;
    let maxDd = 0;
    let ruined = false;
    for (let i = 0; i < n; i++) {
      const r = tradeReturns[Math.floor(rand() * n)];
      equity *= 1 + r * riskFraction;
      if (equity <= 0) {
        ruined = true;
        equity = 0.0001;
      }
      peak = Math.max(peak, equity);
      maxDd = Math.max(maxDd, peak > 0 ? (peak - equity) / peak : 0);
    }
    finals.push((equity - 1) * 100);
    drawdowns.push(maxDd * 100);
    if (ruined || maxDd >= 0.5) ruin++;
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
  };
}
