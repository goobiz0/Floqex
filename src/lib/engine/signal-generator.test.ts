import { describe, it, expect } from "vitest";
import { evaluateCustomStrategy, evaluateOrbStrategy } from "./signal-generator";
import type { MarketData } from "./market-data";

// Minimal MarketData factory. contextFromMarketData falls back to price/dayHigh/
// dayLow/sma50 when no full indicator set is present, which is all these rules use.
function md(over: Partial<MarketData> = {}): MarketData {
  return {
    price: 100,
    dayHigh: 101,
    dayLow: 99,
    sma50: 95,
    market: "US",
    isOpen: true,
    isExtendedOpen: true,
    timestamp: new Date(),
    ...over,
  };
}

const aboveSma = { join: "ALL" as const, conditions: [{ left: "price" as const, op: ">" as const, right: { kind: "indicator" as const, key: "sma50" as const } }] };
const belowSma = { join: "ALL" as const, conditions: [{ left: "price" as const, op: "<" as const, right: { kind: "indicator" as const, key: "sma50" as const } }] };

describe("evaluateCustomStrategy — direction handling", () => {
  it("BOTH takes longs when the long ruleset fires", () => {
    const sig = evaluateCustomStrategy(
      { mode: "BUILDER", direction: "BOTH", groups: [aboveSma], shortGroups: [belowSma] },
      md({ price: 100, sma50: 95 }),
      null,
    );
    expect(sig?.direction).toBe("LONG");
  });

  it("BOTH takes shorts from the separate short ruleset when only it fires", () => {
    const sig = evaluateCustomStrategy(
      { mode: "BUILDER", direction: "BOTH", groups: [aboveSma], shortGroups: [belowSma] },
      md({ price: 90, sma50: 95 }),
      null,
    );
    expect(sig?.direction).toBe("SHORT");
  });

  it("LONG-only never shorts even when the price is below the average", () => {
    const sig = evaluateCustomStrategy(
      { mode: "BUILDER", direction: "LONG", groups: [aboveSma] },
      md({ price: 90, sma50: 95 }),
      null,
    );
    expect(sig).toBeNull();
  });

  it("SHORT-only enters short when its single ruleset fires", () => {
    const sig = evaluateCustomStrategy(
      { mode: "BUILDER", direction: "SHORT", groups: [belowSma] },
      md({ price: 90, sma50: 95 }),
      null,
    );
    expect(sig?.direction).toBe("SHORT");
  });
});

describe("evaluateOrbStrategy — direction bias", () => {
  it("defaults to trading both sides of the break", () => {
    const long = evaluateOrbStrategy({}, md({ price: 101, dayHigh: 101, dayLow: 99 }), null);
    const short = evaluateOrbStrategy({}, md({ price: 99, dayHigh: 101, dayLow: 99 }), null);
    expect(long?.direction).toBe("LONG");
    expect(short?.direction).toBe("SHORT");
  });

  it("respects a long-only bias", () => {
    const long = evaluateOrbStrategy({ direction: "LONG" }, md({ price: 101, dayHigh: 101, dayLow: 99 }), null);
    const short = evaluateOrbStrategy({ direction: "LONG" }, md({ price: 99, dayHigh: 101, dayLow: 99 }), null);
    expect(long?.direction).toBe("LONG");
    expect(short).toBeNull();
  });

  it("respects a short-only bias", () => {
    const long = evaluateOrbStrategy({ direction: "SHORT" }, md({ price: 101, dayHigh: 101, dayLow: 99 }), null);
    const short = evaluateOrbStrategy({ direction: "SHORT" }, md({ price: 99, dayHigh: 101, dayLow: 99 }), null);
    expect(long).toBeNull();
    expect(short?.direction).toBe("SHORT");
  });
});
