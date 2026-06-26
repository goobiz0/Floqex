import { describe, it, expect } from "vitest";
import {
  positionSize,
  riskReward,
  requiredWinRate,
  stopTargetFromAtr,
  leverageMargin,
  profitLoss,
  breakeven,
  kelly,
  expectancy,
  compounding,
  drawdownRecovery,
  monteCarlo,
  mulberry32,
  safe,
} from "./calculators";

describe("safe", () => {
  it("passes finite numbers through and traps NaN/Infinity", () => {
    expect(safe(3.5)).toBe(3.5);
    expect(safe(NaN)).toBe(0);
    expect(safe(Infinity)).toBe(0);
    expect(safe(NaN, 7)).toBe(7);
  });
});

describe("positionSize", () => {
  it("sizes a position so a stop-out costs exactly the risk budget", () => {
    // 1% of 10,000 = 100 risk. Stop is 5 points away. -> 20 units.
    const r = positionSize({ balance: 10_000, riskPct: 1, entry: 100, stop: 95 });
    expect(r.riskAmount).toBe(100);
    expect(r.stopDistance).toBe(5);
    expect(r.rawUnits).toBe(20);
    expect(r.units).toBe(20);
    expect(r.notional).toBe(2000);
    expect(r.leverage).toBeCloseTo(0.2, 6);
  });

  it("never divides by zero when entry equals stop", () => {
    const r = positionSize({ balance: 10_000, riskPct: 1, entry: 100, stop: 100 });
    expect(r.units).toBe(0);
    expect(r.rawUnits).toBe(0);
  });

  it("applies a contract multiplier", () => {
    const r = positionSize({ balance: 10_000, riskPct: 2, entry: 100, stop: 90, contractMultiplier: 2 });
    // risk 200, risk/unit = 10 * 2 = 20 -> 10 units.
    expect(r.riskPerUnit).toBe(20);
    expect(r.rawUnits).toBe(10);
  });
});

describe("riskReward", () => {
  it("computes ratio and break-even win rate for a long", () => {
    const r = riskReward({ entry: 100, stop: 95, target: 110, direction: "LONG" });
    expect(r.risk).toBe(5);
    expect(r.reward).toBe(10);
    expect(r.ratio).toBe(2);
    expect(r.breakevenWinRate).toBeCloseTo(33.333, 2);
    expect(r.valid).toBe(true);
  });

  it("flags an invalid short where the target is above entry", () => {
    const r = riskReward({ entry: 100, stop: 105, target: 110, direction: "SHORT" });
    expect(r.valid).toBe(false);
  });
});

describe("requiredWinRate", () => {
  it("is 50% at 1:1 and 33.3% at 2:1", () => {
    expect(requiredWinRate(1)).toBeCloseTo(50, 6);
    expect(requiredWinRate(2)).toBeCloseTo(33.333, 2);
    expect(requiredWinRate(3)).toBeCloseTo(25, 6);
  });
});

describe("stopTargetFromAtr", () => {
  it("places a long stop below and target above by ATR multiples", () => {
    const r = stopTargetFromAtr({ entry: 100, atr: 2, atrMultiple: 1.5, rr: 2, direction: "LONG" });
    expect(r.stopDistance).toBe(3);
    expect(r.stop).toBe(97);
    expect(r.targetDistance).toBe(6);
    expect(r.target).toBe(106);
  });
});

describe("leverageMargin", () => {
  it("computes margin from leverage", () => {
    const r = leverageMargin({
      equity: 1000,
      entry: 100,
      units: 100,
      leverage: 10,
      maintenanceMarginPct: 0.5,
      direction: "LONG",
    });
    expect(r.notional).toBe(10_000);
    expect(r.marginRequired).toBe(1000);
    expect(r.liquidationPrice).toBeLessThan(100);
    expect(r.liquidationDistancePct).toBeGreaterThan(0);
  });
});

describe("profitLoss", () => {
  it("computes net P&L and R multiple for a winning long", () => {
    const r = profitLoss({ entry: 100, exit: 110, units: 10, direction: "LONG", stop: 95 });
    expect(r.grossPnl).toBe(100);
    expect(r.fees).toBe(0);
    expect(r.netPnl).toBe(100);
    // risk = 5 * 10 = 50, so 100 net = 2R.
    expect(r.rMultiple).toBe(2);
  });

  it("subtracts round-trip fees", () => {
    const r = profitLoss({ entry: 100, exit: 110, units: 10, direction: "LONG", feePct: 0.1 });
    // notional in 1000, out 1100, fee 0.1% each side = (1000+1100)*0.001 = 2.1.
    expect(r.fees).toBeCloseTo(2.1, 6);
    expect(r.netPnl).toBeCloseTo(97.9, 6);
  });

  it("handles a winning short", () => {
    const r = profitLoss({ entry: 100, exit: 90, units: 5, direction: "SHORT" });
    expect(r.grossPnl).toBe(50);
  });
});

describe("breakeven", () => {
  it("returns the move needed to cover fees", () => {
    const r = breakeven(100, 0.2, "LONG");
    expect(r.breakevenMove).toBeCloseTo(0.2, 6);
    expect(r.breakevenPrice).toBeCloseTo(100.2, 6);
  });
});

describe("kelly", () => {
  it("matches the closed form for an even-money positive edge", () => {
    // p=0.6, b=1 -> f = (1*0.6 - 0.4)/1 = 0.2.
    const r = kelly(60, 1);
    expect(r.fraction).toBeCloseTo(0.2, 6);
    expect(r.halfKelly).toBeCloseTo(0.1, 6);
    expect(r.quarterKelly).toBeCloseTo(0.05, 6);
  });

  it("clamps to zero when there is no edge", () => {
    const r = kelly(40, 1);
    expect(r.fraction).toBe(0);
  });

  it("produces a growth curve peaking near the Kelly fraction", () => {
    const r = kelly(60, 1, 100);
    const peak = r.curve.reduce((best, pt) => (pt.growth > best.growth ? pt : best), r.curve[0]);
    expect(peak.fraction).toBeGreaterThan(0.1);
    expect(peak.fraction).toBeLessThan(0.3);
  });
});

describe("expectancy", () => {
  it("computes per-trade expectancy and profit factor", () => {
    const r = expectancy(50, 200, 100);
    // 0.5*200 - 0.5*100 = 50.
    expect(r.perTrade).toBe(50);
    expect(r.perR).toBeCloseTo(0.5, 6);
    expect(r.profitFactor).toBeCloseTo(2, 6);
  });
});

describe("compounding", () => {
  it("compounds without contributions", () => {
    const r = compounding({ start: 1000, ratePct: 10, periods: 2 });
    expect(r.series).toHaveLength(3);
    expect(r.finalBalance).toBeCloseTo(1210, 6);
    expect(r.totalGrowth).toBeCloseTo(210, 6);
  });

  it("adds recurring contributions", () => {
    const r = compounding({ start: 1000, ratePct: 0, periods: 3, contribution: 100 });
    expect(r.finalBalance).toBeCloseTo(1300, 6);
    expect(r.totalContributed).toBeCloseTo(1300, 6);
  });
});

describe("drawdownRecovery", () => {
  it("needs 100% gain to recover a 50% drawdown", () => {
    expect(drawdownRecovery(50)).toBeCloseTo(100, 6);
    expect(drawdownRecovery(20)).toBeCloseTo(25, 6);
  });
});

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});

describe("monteCarlo", () => {
  it("is reproducible for a fixed seed", () => {
    const cfg = { start: 10_000, riskPct: 1, winRate: 55, rr: 1.5, trades: 100, sims: 200, ruinPct: 50, seed: 7 };
    const a = monteCarlo(cfg);
    const b = monteCarlo(cfg);
    expect(a.median).toBe(b.median);
    expect(a.probProfit).toBe(b.probProfit);
  });

  it("orders percentiles and grows a strong positive edge", () => {
    const r = monteCarlo({ start: 10_000, riskPct: 1, winRate: 60, rr: 2, trades: 200, sims: 300, ruinPct: 50, seed: 3 });
    expect(r.p5).toBeLessThanOrEqual(r.median);
    expect(r.median).toBeLessThanOrEqual(r.p95);
    expect(r.median).toBeGreaterThan(10_000);
    expect(r.probProfit).toBeGreaterThan(50);
    expect(r.histogram.reduce((s, h) => s + h.count, 0)).toBe(300);
  });

  it("reports high risk of ruin for a negative edge", () => {
    const r = monteCarlo({ start: 10_000, riskPct: 5, winRate: 35, rr: 1, trades: 300, sims: 300, ruinPct: 50, seed: 9 });
    expect(r.riskOfRuin).toBeGreaterThan(50);
    expect(r.median).toBeLessThan(10_000);
  });
});
