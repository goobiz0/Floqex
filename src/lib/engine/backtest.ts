// Pure, dependency-free strategy backtest used by the Strategy Lab sandbox.
//
// It walks real daily OHLC bars and simulates the same breakout logic the live
// engine runs, honoring the user's actual parameters (risk per trade, reward:
// risk, stop distance, trend filter). Daily bars can't model true intraday
// sequencing, so when a day touches both the stop and the target we resolve to
// the stop (the conservative assumption). The result is an honest estimate over
// real history, not a fabricated curve.

import { atr as atrOf } from "./indicators";

export type Bar = { date: string; open: number; high: number; low: number; close: number };

export type BacktestParams = {
  riskPct?: number; // % of equity risked per trade (0.1 - 2)
  rrTarget?: number; // reward : risk multiple
  stopLossPct?: number; // stop distance as % of entry
  trendFilter?: boolean;
  direction?: "LONG" | "SHORT" | "BOTH";
  /** Trail the stop by this % of entry as price moves favorably (0 disables).
   *  On daily bars this models a trail that locks in profit when price pulls
   *  back from the bar's extreme — an approximation of the intraday engine. */
  trailingStopPct?: number;
  /** When > 0, size the stop from realised volatility (stop = ATR × this) over
   *  a trailing 14-bar window instead of a fixed percentage of price. */
  atrStopMultiple?: number;
};

const ATR_PERIOD = 14;

export type BacktestResult = {
  series: { date: string; equity: number }[];
  startEquity: number;
  endEquity: number;
  trades: number;
  wins: number;
  winRate: number; // %
  totalReturnPct: number;
  maxDrawdownPct: number;
  profitFactor: number | null; // null when there are no losses to divide by
  barsCount: number;
  /** Realised R-multiple per trade (winner ~ +rr, loser ~ -1). Powers the
   *  R-distribution and Monte Carlo views without re-running the simulation. */
  tradeReturns: number[];
};

const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function backtestStrategy(bars: Bar[], params: BacktestParams): BacktestResult {
  const START = 10000;
  const series: { date: string; equity: number }[] = [{ date: bars[0]?.date ?? "Start", equity: START }];

  if (bars.length < 5) {
    return {
      series,
      startEquity: START,
      endEquity: START,
      trades: 0,
      wins: 0,
      winRate: 0,
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      profitFactor: null,
      barsCount: bars.length,
      tradeReturns: [],
    };
  }

  const riskPct = clampNum(params.riskPct ?? 1, 0.1, 2) / 100;
  const rr = clampNum(params.rrTarget ?? 2, 0.5, 10);
  const stopPct = clampNum(params.stopLossPct ?? 0.5, 0.05, 10) / 100;
  const bias = params.direction ?? "BOTH";
  const trailPct = clampNum(params.trailingStopPct ?? 0, 0, 10) / 100;
  const atrMult = clampNum(params.atrStopMultiple ?? 0, 0, 5);

  const closes = bars.map((b) => b.close);

  let equity = START;
  let wins = 0;
  let trades = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let peak = START;
  let maxDD = 0;
  const tradeReturns: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i];
    const prevClose = bars[i - 1].close;

    // Direction: momentum off the prior close, optionally constrained by a bias.
    let direction: "LONG" | "SHORT" = bar.open >= prevClose ? "LONG" : "SHORT";
    if (bias === "LONG") direction = "LONG";
    else if (bias === "SHORT") direction = "SHORT";

    let take = true;

    // Trend filter: a 20-day simple moving average gate, matching the live idea.
    if (params.trendFilter) {
      const window = closes.slice(Math.max(0, i - 20), i);
      const sma = window.reduce((a, b) => a + b, 0) / window.length;
      if (direction === "LONG" && bar.open < sma) take = false;
      if (direction === "SHORT" && bar.open > sma) take = false;
    }

    // Skip days that are too flat to break out of (0.15%, was 0.2% — captures
    // more real, tradeable sessions on lower-volatility instruments).
    const range = (bar.high - bar.low) / bar.open;
    if (range < 0.0015) take = false;

    if (!take) {
      series.push({ date: bar.date, equity });
      continue;
    }

    const entry = bar.open;
    // Stop distance: ATR-scaled when enabled (and enough history exists),
    // otherwise a fixed percentage of entry.
    let riskDist = entry * stopPct;
    if (atrMult > 0 && i >= ATR_PERIOD + 1) {
      const atrVal = atrOf(bars.slice(Math.max(0, i - (ATR_PERIOD * 2)), i), ATR_PERIOD);
      if (atrVal != null && atrVal > 0) riskDist = atrVal * atrMult;
    }
    const stop = direction === "LONG" ? entry - riskDist : entry + riskDist;
    const target = direction === "LONG" ? entry + riskDist * rr : entry - riskDist * rr;
    const trailDist = trailPct > 0 ? entry * trailPct : 0;

    let pnlPerUnit: number;
    if (direction === "LONG") {
      const hitStop = bar.low <= stop;
      const hitTarget = bar.high >= target;
      if (hitStop) pnlPerUnit = -riskDist; // stop assumed first if both touched
      else if (hitTarget) pnlPerUnit = riskDist * rr;
      else {
        // Neither: mark out at the close, but if a trailing stop is set and price
        // pulled back from the bar's high by more than the trail distance, the
        // trail would have locked in that higher level.
        let exit = bar.close;
        if (trailDist > 0) {
          const trailExit = bar.high - trailDist;
          if (trailExit > exit && trailExit > stop) exit = trailExit;
        }
        pnlPerUnit = exit - entry;
      }
    } else {
      const hitStop = bar.high >= stop;
      const hitTarget = bar.low <= target;
      if (hitStop) pnlPerUnit = -riskDist;
      else if (hitTarget) pnlPerUnit = riskDist * rr;
      else {
        let exit = bar.close;
        if (trailDist > 0) {
          const trailExit = bar.low + trailDist;
          if (trailExit < exit && trailExit < stop) exit = trailExit;
        }
        pnlPerUnit = entry - exit;
      }
    }

    const riskBudget = equity * riskPct;
    const size = riskDist > 0 ? riskBudget / riskDist : 0;
    const pnl = pnlPerUnit * size;

    // Realised R for this trade: P&L per unit expressed in units of risk.
    tradeReturns.push(riskDist > 0 ? pnlPerUnit / riskDist : 0);

    equity += pnl;
    trades++;
    if (pnl >= 0) {
      wins++;
      grossWin += pnl;
    } else {
      grossLoss += -pnl;
    }
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, peak > 0 ? (peak - equity) / peak : 0);

    series.push({ date: bar.date, equity: Math.round(equity * 100) / 100 });
  }

  return {
    series,
    startEquity: START,
    endEquity: equity,
    trades,
    wins,
    winRate: trades ? (wins / trades) * 100 : 0,
    totalReturnPct: ((equity - START) / START) * 100,
    maxDrawdownPct: maxDD * 100,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    barsCount: bars.length,
    tradeReturns,
  };
}
