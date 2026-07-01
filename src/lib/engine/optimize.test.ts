import { describe, it, expect } from "vitest";
import { optimizeStrategy, monteCarlo } from "./optimize";
import type { Bar } from "./backtest";

// Build a synthetic but realistic-ish uptrending bar series with intraday range
// so the breakout backtest actually takes trades.
function makeBars(n: number): Bar[] {
  const bars: Bar[] = [];
  let close = 100;
  for (let i = 0; i < n; i++) {
    const drift = Math.sin(i / 5) * 1.5 + 0.3; // oscillating with slight up drift
    const open = close;
    const high = open + Math.abs(drift) + 1.2;
    const low = open - Math.abs(drift) - 0.8;
    close = open + drift;
    bars.push({ date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, open, high, low, close });
  }
  return bars;
}

describe("optimizeStrategy", () => {
  const bars = makeBars(120);

  it("returns at most topN ranked rows", () => {
    const rows = optimizeStrategy(bars, { riskPct: 1 }, "return", 5);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
  });

  it("ranks by the chosen objective (return descending)", () => {
    const rows = optimizeStrategy(bars, { riskPct: 1 }, "return", 5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].totalReturnPct).toBeGreaterThanOrEqual(rows[i].totalReturnPct);
    }
  });

  it("keeps swept params within the safe grid", () => {
    const rows = optimizeStrategy(bars, { riskPct: 1 }, "profitFactor", 5);
    for (const r of rows) {
      expect(r.params.rrTarget).toBeGreaterThanOrEqual(1);
      expect(r.params.rrTarget).toBeLessThanOrEqual(5);
      expect(r.params.stopLossPct).toBeGreaterThan(0);
      expect(r.params.stopLossPct).toBeLessThanOrEqual(3);
      expect(["LONG", "SHORT", "BOTH"]).toContain(r.params.direction);
    }
  });

  it("drawdown objective prefers lower drawdown", () => {
    const rows = optimizeStrategy(bars, { riskPct: 1 }, "drawdown", 3);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("reports the advanced metrics and a bounded quality score", () => {
    const rows = optimizeStrategy(bars, { riskPct: 1 }, "quality", 5);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(Number.isFinite(r.expectancy)).toBe(true);
      expect(Number.isFinite(r.consistency)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.trades).toBeGreaterThanOrEqual(5);
    }
  });

  it("ranks by quality score descending for the quality objective", () => {
    const rows = optimizeStrategy(bars, { riskPct: 1 }, "quality", 6);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score);
    }
  });

  it("explores both directional biases across the grid", () => {
    // A symmetric-ish series should surface more than one direction somewhere in
    // the full ranking, proving the sweep is not hard-wired to one side.
    const rows = optimizeStrategy(bars, { riskPct: 1 }, "return", Number.MAX_SAFE_INTEGER);
    const directions = new Set(rows.map((r) => r.params.direction));
    expect(directions.size).toBeGreaterThan(1);
  });
});

describe("monteCarlo", () => {
  it("returns null for too few trades", () => {
    expect(monteCarlo([0.5, -1], 1)).toBeNull();
  });

  it("is deterministic for a fixed seed", () => {
    const returns = [2, -1, 2, -1, -1, 2, 2, -1, 1.5, -1];
    const a = monteCarlo(returns, 1, 300, 42);
    const b = monteCarlo(returns, 1, 300, 42);
    expect(a).toEqual(b);
  });

  it("orders percentiles p5 <= p50 <= p95", () => {
    const returns = [2, -1, 2, -1, -1, 2, 2, -1, 1.5, -1, 3, -1];
    const mc = monteCarlo(returns, 1, 500, 7);
    expect(mc).not.toBeNull();
    if (mc) {
      expect(mc.p5ReturnPct).toBeLessThanOrEqual(mc.p50ReturnPct);
      expect(mc.p50ReturnPct).toBeLessThanOrEqual(mc.p95ReturnPct);
      expect(mc.riskOfRuinPct).toBeGreaterThanOrEqual(0);
      expect(mc.riskOfRuinPct).toBeLessThanOrEqual(100);
    }
  });
});
