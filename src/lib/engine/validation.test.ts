import { describe, it, expect } from "vitest";
import type { Bar } from "./backtest";
import {
  simulateIntraday,
  walkForward,
  bootstrapMonteCarlo,
  robustnessGrid,
  computeEdgeScore,
  runValidation,
  DEFAULT_COSTS,
  type ValidationParams,
} from "./validation";

// Build deterministic intraday bars. Each day opens with a 6-bar (30 min @ 5m)
// range, then either breaks out and trends or breaks down and falls, so the ORB
// simulator has a clean, predictable signal to act on.
function buildBars(days: number, pattern: "up" | "down", barsPerDay = 12, intervalMin = 5): Bar[] {
  const out: Bar[] = [];
  const start = Date.UTC(2026, 0, 5, 14, 30, 0); // a Monday, 14:30Z
  for (let d = 0; d < days; d++) {
    const dayStart = start + d * 24 * 3600 * 1000;
    const base = 100 + d * 0.1;
    for (let i = 0; i < barsPerDay; i++) {
      const ts = new Date(dayStart + i * intervalMin * 60000).toISOString();
      let open: number, high: number, low: number, close: number;
      if (i < 6) {
        open = base;
        close = base;
        high = base * 1.01;
        low = base * 0.99;
      } else if (pattern === "up") {
        const lvl = base * 1.01 + (i - 5) * base * 0.005;
        open = lvl - base * 0.002;
        close = lvl;
        high = lvl + base * 0.003;
        low = lvl - base * 0.004;
      } else {
        const lvl = base * 0.99 - (i - 5) * base * 0.005;
        open = lvl + base * 0.002;
        close = lvl;
        high = lvl + base * 0.004;
        low = lvl - base * 0.003;
      }
      out.push({ date: ts, open, high, low, close });
    }
  }
  return out;
}

const PARAMS: ValidationParams = { riskPct: 1, rrTarget: 2, stopLossPct: 0.5, direction: "BOTH" };
const OPTS = { intervalMinutes: 5, openingRangeMinutes: 30 };

describe("simulateIntraday", () => {
  it("takes one ORB long per up-trending day and is profitable net of costs", () => {
    const bars = buildBars(10, "up");
    const r = simulateIntraday(bars, PARAMS, DEFAULT_COSTS, OPTS);
    expect(r.tradeCount).toBe(10);
    expect(r.trades.every((t) => t.direction === "LONG")).toBe(true);
    expect(r.winRate).toBeGreaterThan(50);
    expect(r.totalReturnPct).toBeGreaterThan(0);
    expect(r.endEquity).toBeGreaterThan(r.startEquity);
  });

  it("is fully deterministic for identical inputs", () => {
    const bars = buildBars(8, "up");
    const a = simulateIntraday(bars, PARAMS, DEFAULT_COSTS, OPTS);
    const b = simulateIntraday(bars, PARAMS, DEFAULT_COSTS, OPTS);
    expect(a.endEquity).toBe(b.endEquity);
    expect(a.rSequence).toEqual(b.rSequence);
  });

  it("respects a SHORT-only bias on a down-trending market", () => {
    const bars = buildBars(8, "down");
    const r = simulateIntraday(bars, { ...PARAMS, direction: "SHORT" }, DEFAULT_COSTS, OPTS);
    expect(r.trades.every((t) => t.direction === "SHORT")).toBe(true);
    expect(r.tradeCount).toBeGreaterThan(0);
  });

  it("returns an empty-but-valid result when there is no data", () => {
    const r = simulateIntraday([], PARAMS, DEFAULT_COSTS, OPTS);
    expect(r.tradeCount).toBe(0);
    expect(r.endEquity).toBe(r.startEquity);
  });
});

describe("walkForward", () => {
  it("splits history and reports in-sample vs out-of-sample", () => {
    const bars = buildBars(20, "up");
    const wf = walkForward(bars, PARAMS, DEFAULT_COSTS, OPTS);
    expect(wf.splitDay).toBeTruthy();
    expect(wf.inSample.tradeCount).toBeGreaterThan(0);
    expect(wf.outOfSample.tradeCount).toBeGreaterThan(0);
    expect(Number.isFinite(wf.degradation)).toBe(true);
  });
});

describe("bootstrapMonteCarlo", () => {
  it("is reproducible for a fixed seed and returns full-length bands", () => {
    const seq = [2, -1, 2, -1, 2, 2, -1];
    const a = bootstrapMonteCarlo(seq, { sims: 200, trades: 30, seed: 7 });
    const b = bootstrapMonteCarlo(seq, { sims: 200, trades: 30, seed: 7 });
    expect(a.finalP50).toBe(b.finalP50);
    expect(a.steps).toHaveLength(31); // step 0 .. trades
    expect(a.probProfit).toBeGreaterThanOrEqual(0);
    expect(a.riskOfRuin).toBeLessThanOrEqual(100);
  });

  it("handles an empty sequence without throwing", () => {
    const r = bootstrapMonteCarlo([], { sims: 50 });
    expect(r.steps).toHaveLength(0);
    expect(r.riskOfRuin).toBe(0);
  });
});

describe("robustnessGrid", () => {
  it("sweeps the parameter grid and reports a positive fraction", () => {
    const bars = buildBars(15, "up");
    const grid = robustnessGrid(bars, PARAMS, DEFAULT_COSTS, OPTS);
    expect(grid.cells.length).toBe(grid.rrAxis.length * grid.stopAxis.length);
    expect(grid.positiveFraction).toBeGreaterThan(0);
    expect(grid.positiveFraction).toBeLessThanOrEqual(1);
  });
});

describe("computeEdgeScore + runValidation", () => {
  it("scores a clean trending edge in range with a valid verdict", () => {
    const bars = buildBars(25, "up");
    const report = runValidation(bars, PARAMS, DEFAULT_COSTS, { ...OPTS, interval: "5m", source: "test", seed: 7 });
    expect(report.edge.score).toBeGreaterThanOrEqual(0);
    expect(report.edge.score).toBeLessThanOrEqual(100);
    expect(["Fragile", "Promising", "Robust"]).toContain(report.edge.verdict);
    expect(report.edge.factors.length).toBeGreaterThanOrEqual(5);
    expect(report.dataWindow.interval).toBe("5m");
    expect(report.dataWindow.days).toBeGreaterThan(0);
  });

  it("computeEdgeScore stays within 0-100", () => {
    const bars = buildBars(20, "up");
    const wf = walkForward(bars, PARAMS, DEFAULT_COSTS, OPTS);
    const mc = bootstrapMonteCarlo(wf.outOfSample.rSequence, { sims: 200, seed: 7 });
    const grid = robustnessGrid(bars, PARAMS, DEFAULT_COSTS, OPTS);
    const edge = computeEdgeScore(wf, mc, grid);
    expect(edge.score).toBeGreaterThanOrEqual(0);
    expect(edge.score).toBeLessThanOrEqual(100);
  });
});
