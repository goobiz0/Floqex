import { describe, it, expect } from "vitest";
import {
  summaryMetrics,
  equitySeries,
  maxDrawdown,
  bySession,
  rDistribution,
  rollingWinRate,
  type TradeRow,
  type DailyRow,
} from "./metrics";

/** Minimal closed trade with sensible defaults; override what a test cares about. */
function trade(over: Partial<TradeRow>): TradeRow {
  return {
    id: Math.random().toString(36).slice(2),
    instrument: "GC",
    direction: "LONG",
    session: "NY",
    status: "CLOSED",
    entryPrice: 100,
    exitPrice: 102,
    stopPrice: 99,
    targetPrice: 104,
    sizeUnits: 1,
    netPnl: 0,
    grossPnl: 0,
    rMultiple: 0,
    openedAt: "2026-06-01T13:30:00.000Z",
    closedAt: "2026-06-01T14:00:00.000Z",
    narrative: null,
    screenshotUrl: null,
    ...over,
  };
}

function daily(date: string, endBalance: number, netPnl = 0): DailyRow {
  return { date, netPnl, tradeCount: 1, winCount: 0, lossCount: 0, startBalance: endBalance - netPnl, endBalance };
}

describe("summaryMetrics", () => {
  const trades = [
    trade({ netPnl: 200, rMultiple: 2 }),
    trade({ netPnl: -100, rMultiple: -1 }),
    trade({ netPnl: 200, rMultiple: 2 }),
    trade({ netPnl: -100, rMultiple: -1 }),
    trade({ status: "OPEN", netPnl: null, rMultiple: null }), // excluded
  ];

  it("counts only closed trades", () => {
    expect(summaryMetrics(trades).count).toBe(4);
  });

  it("computes win rate, totals, and averages", () => {
    const m = summaryMetrics(trades);
    expect(m.winRate).toBe(50);
    expect(m.total).toBe(200);
    expect(m.profitFactor).toBe(2); // 400 gross win / 200 gross loss
    expect(m.avgWin).toBe(200);
    expect(m.avgLoss).toBe(100);
    expect(m.expectancy).toBe(0.5); // (2 - 1 + 2 - 1) / 4
  });

  it("returns zeros for an empty set", () => {
    const m = summaryMetrics([]);
    expect(m).toMatchObject({ count: 0, winRate: 0, total: 0, profitFactor: 0, expectancy: 0 });
  });

  it("reports Infinity profit factor when there are no losses", () => {
    expect(summaryMetrics([trade({ netPnl: 50, rMultiple: 1 })]).profitFactor).toBe(Infinity);
  });
});

describe("equitySeries", () => {
  it("orders points ascending by date", () => {
    const series = equitySeries([
      daily("2026-06-03", 10300),
      daily("2026-06-01", 10000),
      daily("2026-06-02", 10100),
    ]);
    expect(series.map((p) => p.date)).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
    expect(series.map((p) => p.equity)).toEqual([10000, 10100, 10300]);
  });
});

describe("maxDrawdown", () => {
  it("finds the largest peak-to-trough drop", () => {
    const series = equitySeries([
      daily("2026-06-01", 10000),
      daily("2026-06-02", 10500), // peak
      daily("2026-06-03", 10200), // trough -> dd 300
      daily("2026-06-04", 10800),
    ]);
    const dd = maxDrawdown(series);
    expect(dd.amount).toBe(300);
    expect(dd.pct).toBeCloseTo((300 / 10500) * 100, 5);
  });

  it("is zero for a monotonically rising series", () => {
    const series = equitySeries([daily("2026-06-01", 100), daily("2026-06-02", 200)]);
    expect(maxDrawdown(series)).toEqual({ amount: 0, pct: 0 });
  });
});

describe("bySession", () => {
  it("sums net P&L per session", () => {
    const out = bySession([
      trade({ session: "NY", netPnl: 100 }),
      trade({ session: "ASIA", netPnl: -40 }),
      trade({ session: "NY", netPnl: 25 }),
    ]);
    expect(out).toEqual({ NY: 125, ASIA: -40 });
  });
});

describe("rDistribution", () => {
  it("buckets trades by realised R", () => {
    const dist = rDistribution([
      trade({ rMultiple: -2 }), // <= -0.5R
      trade({ rMultiple: 0 }), // -0.5..0.5
      trade({ rMultiple: 1 }), // 0.5..1.5
      trade({ rMultiple: 2 }), // >= 1.5R
      trade({ rMultiple: 2.5 }), // >= 1.5R
    ]);
    expect(dist.map((b) => b.count)).toEqual([1, 1, 1, 2]);
  });

  it("classifies boundary R values by the half-open [min, max) intervals", () => {
    // -0.5 falls into the middle bucket, +0.5 into the next one up.
    const dist = rDistribution([trade({ rMultiple: -0.5 }), trade({ rMultiple: 0.5 })]);
    expect(dist.map((b) => b.count)).toEqual([0, 1, 1, 0]);
  });
});

describe("rollingWinRate", () => {
  it("reports the trailing win rate", () => {
    const out = rollingWinRate(
      [
        trade({ netPnl: 100 }),
        trade({ netPnl: -50 }),
        trade({ netPnl: 100 }),
        trade({ netPnl: 100 }),
      ],
      2,
    );
    // windows: [W]=100, [W,L]=50, [L,W]=50, [W,W]=100
    expect(out).toEqual([100, 50, 50, 100]);
  });
});
