import { describe, it, expect } from "vitest";
import { sma, ema, rsi, atr, computeIndicatorContext, type Bar } from "./indicators";

describe("sma", () => {
  it("averages the last period values", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([2, 4, 6, 8], 2)).toBe(7);
  });
  it("is null with too few values", () => {
    expect(sma([1, 2], 5)).toBeNull();
  });
});

describe("ema", () => {
  it("returns a value close to recent prices for a rising series", () => {
    const v = ema([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(v).not.toBeNull();
    expect(v as number).toBeGreaterThan(5);
    expect(v as number).toBeLessThan(10);
  });
});

describe("rsi", () => {
  it("is 100 for a monotonically rising series", () => {
    const rising = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(rsi(rising, 14)).toBe(100);
  });
  it("sits near 50 for an alternating series", () => {
    const alt = Array.from({ length: 40 }, (_, i) => 100 + (i % 2 === 0 ? 1 : -1));
    const v = rsi(alt, 14);
    expect(v).not.toBeNull();
    expect(v as number).toBeGreaterThan(30);
    expect(v as number).toBeLessThan(70);
  });
  it("is null with too few values", () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });
});

describe("atr", () => {
  it("computes a positive range for varied bars", () => {
    const bars: Bar[] = Array.from({ length: 20 }, (_, i) => ({
      high: 102 + i,
      low: 98 + i,
      close: 100 + i,
    }));
    const v = atr(bars, 14);
    expect(v).not.toBeNull();
    expect(v as number).toBeGreaterThan(0);
  });
});

describe("computeIndicatorContext", () => {
  it("builds a full context and computes change %", () => {
    const bars: Bar[] = Array.from({ length: 60 }, (_, i) => ({
      high: 100 + i,
      low: 96 + i,
      close: 98 + i,
    }));
    const ctx = computeIndicatorContext(bars, { price: 160, dayHigh: 162, dayLow: 158, prevClose: 157, volume: 5000 });
    expect(ctx.price).toBe(160);
    expect(ctx.sma20).not.toBeNull();
    expect(ctx.sma50).not.toBeNull();
    expect(ctx.rsi14).not.toBeNull();
    expect(ctx.changePct).toBeCloseTo(((160 - 157) / 157) * 100, 4);
    expect(ctx.rangePosition).toBeCloseTo(((160 - 158) / (162 - 158)) * 100, 4);
  });

  it("returns null for indicators without enough history", () => {
    const ctx = computeIndicatorContext([{ high: 10, low: 9, close: 9.5 }], { price: 10, dayHigh: 10, dayLow: 9 });
    expect(ctx.sma200).toBeNull();
    expect(ctx.rsi14).toBeNull();
  });
});
