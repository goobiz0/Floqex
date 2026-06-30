import { describe, it, expect } from "vitest";
import {
  computeFollowerUnits,
  flipDirection,
  shortAccountId,
  parseSymbolFilter,
  symbolAllowed,
  riskCappedUnits,
  resolveCopyOrder,
  type CopyRule,
} from "./copy-trading";

describe("computeFollowerUnits", () => {
  const base = { masterUnits: 10, masterBalance: 10_000, followerBalance: 5_000, multiplier: 1, fixedUnits: null };

  it("mirrors the master size one for one", () => {
    expect(computeFollowerUnits({ ...base, sizingMode: "MIRROR" })).toBe(10);
  });

  it("applies a multiplier", () => {
    expect(computeFollowerUnits({ ...base, sizingMode: "MULTIPLIER", multiplier: 2 })).toBe(20);
    expect(computeFollowerUnits({ ...base, sizingMode: "MULTIPLIER", multiplier: 0.5 })).toBe(5);
  });

  it("scales proportionally by equity ratio times multiplier", () => {
    // follower has half the equity, so half the size
    expect(computeFollowerUnits({ ...base, sizingMode: "PROPORTIONAL" })).toBe(5);
    expect(computeFollowerUnits({ ...base, sizingMode: "PROPORTIONAL", multiplier: 2 })).toBe(10);
  });

  it("returns zero proportional size when the master balance is zero", () => {
    expect(computeFollowerUnits({ ...base, sizingMode: "PROPORTIONAL", masterBalance: 0 })).toBe(0);
  });

  it("uses a fixed size when configured", () => {
    expect(computeFollowerUnits({ ...base, sizingMode: "FIXED", fixedUnits: 3 })).toBe(3);
    expect(computeFollowerUnits({ ...base, sizingMode: "FIXED", fixedUnits: null })).toBe(0);
  });

  it("never returns a negative or non-finite size", () => {
    expect(computeFollowerUnits({ ...base, sizingMode: "MULTIPLIER", multiplier: -5 })).toBe(10);
    expect(computeFollowerUnits({ ...base, sizingMode: "MIRROR", masterUnits: -4 })).toBe(0);
  });

  it("rounds to 4 decimal places", () => {
    expect(
      computeFollowerUnits({ ...base, masterUnits: 1, masterBalance: 3, followerBalance: 1, sizingMode: "PROPORTIONAL" }),
    ).toBe(0.3333);
  });
});

describe("flipDirection", () => {
  it("inverts the direction", () => {
    expect(flipDirection("LONG")).toBe("SHORT");
    expect(flipDirection("SHORT")).toBe("LONG");
  });
});

describe("shortAccountId", () => {
  it("formats the last six characters as an uppercase tag", () => {
    expect(shortAccountId("clz9abc123def")).toBe("#123DEF");
    expect(shortAccountId("ab")).toBe("#AB");
  });
});

describe("parseSymbolFilter", () => {
  it("normalizes, uppercases, and de-dupes tokens", () => {
    expect(parseSymbolFilter("btc, ETH  eth;sol")).toEqual(["BTC", "ETH", "SOL"]);
  });
  it("returns an empty list for blank input", () => {
    expect(parseSymbolFilter("")).toEqual([]);
    expect(parseSymbolFilter(null)).toEqual([]);
    expect(parseSymbolFilter("   ")).toEqual([]);
  });
});

describe("symbolAllowed", () => {
  it("allows everything when no filter is set", () => {
    expect(symbolAllowed("BTC/USD", null, "ALLOW")).toBe(true);
    expect(symbolAllowed("BTC/USD", "", "DENY")).toBe(true);
  });
  it("matches a leg of a pair in ALLOW mode", () => {
    expect(symbolAllowed("BTC/USD", "BTC", "ALLOW")).toBe(true);
    expect(symbolAllowed("ETH-USD", "btc", "ALLOW")).toBe(false);
  });
  it("does not match a substring that is not a whole leg", () => {
    // "ETH" must not match "ETHW"
    expect(symbolAllowed("ETHW/USD", "ETH", "ALLOW")).toBe(false);
  });
  it("inverts the result in DENY mode", () => {
    expect(symbolAllowed("BTC/USD", "BTC", "DENY")).toBe(false);
    expect(symbolAllowed("SOL/USD", "BTC", "DENY")).toBe(true);
  });
});

describe("riskCappedUnits", () => {
  it("caps size to the max-risk ceiling", () => {
    // 2% of 10k = $200 risk budget; stop distance 5 -> 40 units max
    expect(riskCappedUnits(100, 10_000, 5, 2)).toBe(40);
  });
  it("leaves size untouched when already under the cap", () => {
    expect(riskCappedUnits(10, 10_000, 5, 2)).toBe(10);
  });
  it("is a no-op when no cap, no stop distance, or no balance", () => {
    expect(riskCappedUnits(100, 10_000, 5, null)).toBe(100);
    expect(riskCappedUnits(100, 10_000, 0, 2)).toBe(100);
    expect(riskCappedUnits(100, 0, 5, 2)).toBe(100);
  });
});

describe("resolveCopyOrder", () => {
  const rule: CopyRule = {
    sizingMode: "MIRROR",
    multiplier: 1,
    fixedUnits: null,
    maxRiskPct: null,
    minUnits: null,
    maxUnits: null,
    reverse: false,
    symbolFilter: null,
    symbolFilterMode: "ALLOW",
  };
  const input = {
    direction: "LONG" as const,
    masterUnits: 10,
    masterBalance: 10_000,
    followerBalance: 5_000,
    instrument: "BTC/USD",
    entryPrice: 100,
    stopPrice: 95,
    targetPrice: 110,
    masterRiskPct: 0.01,
    rule,
  };

  it("mirrors size and direction with real follower risk", () => {
    const r = resolveCopyOrder(input);
    expect(r.skip).toBeNull();
    expect(r.units).toBe(10);
    expect(r.direction).toBe("LONG");
    // 10 units * stop distance 5 / 5000 balance = 0.01
    expect(r.riskPct).toBeCloseTo(0.01, 6);
  });

  it("swaps stop and target and flips direction on reverse", () => {
    const r = resolveCopyOrder({ ...input, rule: { ...rule, reverse: true } });
    expect(r.direction).toBe("SHORT");
    expect(r.stopPrice).toBe(110); // master target becomes follower stop
    expect(r.targetPrice).toBe(95);
  });

  it("skips a symbol the allow list excludes", () => {
    const r = resolveCopyOrder({ ...input, rule: { ...rule, symbolFilter: "ETH", symbolFilterMode: "ALLOW" } });
    expect(r.units).toBe(0);
    expect(r.skip?.code).toBe("SYMBOL_FILTERED");
  });

  it("caps size to the max-risk ceiling and lowers reported risk", () => {
    // mirror would be 10 units (1% risk); cap at 0.5% -> 5 units
    const r = resolveCopyOrder({ ...input, rule: { ...rule, maxRiskPct: 0.5 } });
    expect(r.units).toBe(5);
    expect(r.riskPct).toBeCloseTo(0.005, 6);
  });

  it("applies the max-units ceiling", () => {
    const r = resolveCopyOrder({ ...input, rule: { ...rule, maxUnits: 4 } });
    expect(r.units).toBe(4);
  });

  it("floors a tiny proportional copy up to the minimum", () => {
    const r = resolveCopyOrder({
      ...input,
      followerBalance: 100,
      rule: { ...rule, sizingMode: "PROPORTIONAL", minUnits: 2 },
    });
    // proportional would be 10 * (100/10000) = 0.1, floored to 2
    expect(r.units).toBe(2);
  });

  it("explains a zero-size proportional copy with no master balance", () => {
    const r = resolveCopyOrder({
      ...input,
      masterBalance: 0,
      rule: { ...rule, sizingMode: "PROPORTIONAL" },
    });
    expect(r.units).toBe(0);
    expect(r.skip?.code).toBe("ZERO_SIZE");
    expect(r.skip?.reason).toMatch(/master balance/i);
  });
});
