import { describe, it, expect } from "vitest";
import type { Bar } from "./engine/backtest";
import { runValidation, DEFAULT_COSTS, type ValidationParams } from "./engine/validation";
import { STRATEGY_TEMPLATES } from "./strategy-templates";

// Build deterministic up-trending intraday days with a clean opening range, a
// genuine breakout, and realistic intrabar pullbacks (~0.4%). The pullbacks are
// shallow enough that every preset's calibrated stop (0.6%+) survives them but
// would shake out the old, too-tight 0.5% stop — which is exactly the edge the
// Workstream 2 recalibration is meant to capture. One ORB long per day, hit at
// target, gives the validation engine a real, robust edge to score.
function buildTrendingBars(days: number, barsPerDay = 12, intervalMin = 5): Bar[] {
  const out: Bar[] = [];
  const start = Date.UTC(2026, 0, 5, 14, 30, 0); // a Monday, 14:30Z
  for (let d = 0; d < days; d++) {
    const dayStart = start + d * 24 * 3600 * 1000;
    const base = 100 + d * 0.1;
    const orHigh = base * 1.01;
    for (let i = 0; i < barsPerDay; i++) {
      const ts = new Date(dayStart + i * intervalMin * 60000).toISOString();
      let open: number, high: number, low: number, close: number;
      if (i < 6) {
        // Opening range: ~2% high-to-low band centred on `base`.
        open = base;
        close = base;
        high = base * 1.01;
        low = base * 0.99;
      } else {
        // Strong, mostly monotonic up-leg above the range, with a shallow 0.4%
        // intrabar dip so a tight stop (but not a 0.6%+ stop) would be hit.
        const lvl = orHigh + (i - 5) * base * 0.006;
        open = lvl - base * 0.001;
        close = lvl;
        high = lvl + base * 0.002;
        low = lvl - base * 0.004;
      }
      out.push({ date: ts, open, high, low, close });
    }
  }
  return out;
}

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

// Map a stored template params blob onto the params the validation engine reads.
// Custom (builder) templates express their reward target as `targetRatio`, ORB
// templates as `rrTarget`; the engine simulates ORB and reads `rrTarget`, so we
// prefer whichever the template set.
function toValidationParams(p: Record<string, unknown>): ValidationParams {
  return {
    riskPct: num(p.riskPct, 1),
    rrTarget: num(p.rrTarget ?? p.targetRatio, 1.8),
    stopLossPct: num(p.stopLossPct, 0.75),
    trendFilter: Boolean(p.trendFilter),
    direction: p.direction === "SHORT" ? "SHORT" : p.direction === "LONG" ? "LONG" : "BOTH",
    minRange: num(p.minRange, 0.2),
    maxRange: num(p.maxRange, 3),
    trailingStopPct: num(p.trailingStopPct, 0),
  };
}

describe("strategy preset quality", () => {
  const bars = buildTrendingBars(50);

  for (const t of STRATEGY_TEMPLATES) {
    it(`"${t.name}" scores Promising or better on a clean trending edge`, () => {
      const params = toValidationParams(t.buildParams());
      const report = runValidation(bars, params, DEFAULT_COSTS, {
        interval: "5m",
        intervalMinutes: 5,
        openingRangeMinutes: 30,
        source: "test",
        seed: 7,
      });

      // The preset takes trades and produces an honest, non-fragile verdict.
      expect(report.full.tradeCount).toBeGreaterThan(0);
      expect(report.edge.score).toBeGreaterThanOrEqual(45);
      expect(["Promising", "Robust"]).toContain(report.edge.verdict);
    });
  }

  it("every preset's out-of-sample edge is non-negative on a real up-trend", () => {
    for (const t of STRATEGY_TEMPLATES) {
      const report = runValidation(bars, toValidationParams(t.buildParams()), DEFAULT_COSTS, {
        interval: "5m",
        intervalMinutes: 5,
        openingRangeMinutes: 30,
        seed: 7,
      });
      expect(report.walkForward.outOfSample.expectancyR).toBeGreaterThanOrEqual(0);
    }
  });
});
