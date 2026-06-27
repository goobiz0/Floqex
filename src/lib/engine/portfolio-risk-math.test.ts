import { describe, it, expect } from "vitest";
import { pearson, correlationMatrix, concentration, evaluateBreaches } from "./portfolio-risk-math";

describe("pearson", () => {
  it("is +1 for a perfectly correlated series", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6);
  });
  it("is -1 for a perfectly anti-correlated series", () => {
    expect(pearson([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 6);
  });
  it("is 0 for a flat series or too little data", () => {
    expect(pearson([1, 1, 1], [3, 9, 2])).toBe(0);
    expect(pearson([1], [2])).toBe(0);
  });
});

describe("correlationMatrix", () => {
  it("has a unit diagonal and is symmetric", () => {
    const m = correlationMatrix([
      [1, 2, 3, 4],
      [4, 3, 2, 1],
      [1, 2, 3, 4],
    ]);
    expect(m[0][0]).toBe(1);
    expect(m[1][1]).toBe(1);
    expect(m[0][1]).toBe(m[1][0]);
    expect(m[0][2]).toBeCloseTo(1, 6);
  });
});

describe("concentration", () => {
  it("groups by key, sorts by notional, and shares sum to ~100", () => {
    const slices = concentration([
      { key: "NQ", notional: 6000 },
      { key: "ES", notional: 3000 },
      { key: "NQ", notional: 1000 },
    ]);
    expect(slices[0].key).toBe("NQ");
    expect(slices[0].notional).toBe(7000);
    expect(slices[0].pct).toBeCloseTo(70, 1);
    const sum = slices.reduce((a, s) => a + s.pct, 0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
  });
  it("returns nothing for no exposure", () => {
    expect(concentration([])).toEqual([]);
  });
});

describe("evaluateBreaches", () => {
  it("flags the kill switch", () => {
    const b = evaluateBreaches({ todayNetPnl: 0, concentration: [] }, { maxPortfolioDrawdown: null, tradingHalted: true });
    expect(b.some((x) => x.kind === "HALTED")).toBe(true);
  });
  it("flags a breached portfolio drawdown limit", () => {
    const b = evaluateBreaches({ todayNetPnl: -1200, concentration: [] }, { maxPortfolioDrawdown: 1000, tradingHalted: false });
    expect(b.some((x) => x.kind === "DRAWDOWN" && x.severity === "critical")).toBe(true);
  });
  it("does not flag drawdown while within the limit", () => {
    const b = evaluateBreaches({ todayNetPnl: -500, concentration: [] }, { maxPortfolioDrawdown: 1000, tradingHalted: false });
    expect(b.some((x) => x.kind === "DRAWDOWN")).toBe(false);
  });
  it("warns when one instrument dominates exposure", () => {
    const b = evaluateBreaches(
      { todayNetPnl: 0, concentration: [{ key: "NQ", notional: 9000, pct: 90 }, { key: "ES", notional: 1000, pct: 10 }] },
      { maxPortfolioDrawdown: null, tradingHalted: false },
    );
    expect(b.some((x) => x.kind === "CONCENTRATION")).toBe(true);
  });
  it("is clean for a healthy, diversified, live portfolio", () => {
    const b = evaluateBreaches(
      { todayNetPnl: 250, concentration: [{ key: "NQ", notional: 5000, pct: 50 }, { key: "ES", notional: 5000, pct: 50 }] },
      { maxPortfolioDrawdown: 1000, tradingHalted: false },
    );
    expect(b).toEqual([]);
  });
});
