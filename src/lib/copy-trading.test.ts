import { describe, it, expect } from "vitest";
import { computeFollowerUnits, flipDirection, shortAccountId } from "./copy-trading";

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
