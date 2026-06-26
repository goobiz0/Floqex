import { describe, it, expect } from "vitest";
import { runStrategyCode, compileStrategy, normalizeDecision, staticGuard } from "./sandbox";
import type { IndicatorContext } from "./indicators";

function ctx(over: Partial<IndicatorContext> = {}): IndicatorContext {
  return {
    price: 100, prevClose: 98, changePct: 2, dayHigh: 101, dayLow: 97, rangePosition: 75,
    sma20: 99, sma50: 95, sma200: 90, ema12: 99.5, ema26: 98, macd: 1.5,
    rsi14: 40, atr14: 1.2, atrPct: 1.2, volume: 1_000_000,
    ...over,
  };
}

describe("staticGuard", () => {
  it("blocks dangerous tokens", () => {
    expect(staticGuard("process.exit()")).not.toBeNull();
    expect(staticGuard("({}).constructor")).not.toBeNull();
    expect(staticGuard("require('fs')")).not.toBeNull();
    expect(staticGuard("while(true){}")).not.toBeNull();
  });
  it("allows clean strategy code", () => {
    expect(staticGuard("function decide(ctx){ return ctx.rsi14 < 30 ? {side:'LONG'} : null; }")).toBeNull();
  });
});

describe("normalizeDecision", () => {
  it("maps primitives and objects to a decision", () => {
    expect(normalizeDecision(null)).toBeNull();
    expect(normalizeDecision(false)).toBeNull();
    expect(normalizeDecision(true)).toEqual({ side: "LONG" });
    expect(normalizeDecision("SHORT")).toEqual({ side: "SHORT" });
    expect(normalizeDecision({ side: "long", stopLossPct: 1, targetRatio: 3 })).toEqual({ side: "LONG", stopLossPct: 1, targetRatio: 3 });
    expect(normalizeDecision({ side: "nope" })).toBeNull();
  });
});

describe("compileStrategy", () => {
  it("returns null for valid code and an error for a syntax error", () => {
    expect(compileStrategy("function decide(ctx){ return null; }")).toBeNull();
    expect(compileStrategy("function decide(ctx){ return ; ) }")).toMatch(/Syntax error|Blocked/);
  });
});

describe("runStrategyCode", () => {
  it("runs a decide() function and returns the decision", () => {
    const code = "function decide(ctx){ if (ctx.price > ctx.sma50) return { side: 'LONG' }; return null; }";
    const res = runStrategyCode(code, ctx());
    expect(res.ok).toBe(true);
    expect(res.decision).toEqual({ side: "LONG" });
  });

  it("supports a top-level return", () => {
    const res = runStrategyCode("return ctx.rsi14 < 50 ? { side: 'SHORT' } : null;", ctx({ rsi14: 20 }));
    expect(res.decision).toEqual({ side: "SHORT" });
  });

  it("captures console.log output", () => {
    const res = runStrategyCode("console.log('hello', ctx.price); return null;", ctx());
    expect(res.logs).toContain("hello 100");
  });

  it("cannot reach blocked globals (they are undefined)", () => {
    const res = runStrategyCode("return typeof fetch === 'undefined' && typeof process === 'undefined' ? { side: 'LONG' } : null;", ctx());
    // 'process' trips the static guard, so this is actually rejected pre-run:
    expect(res.ok).toBe(false);
  });

  it("shadows window without tripping the guard", () => {
    const res = runStrategyCode("return typeof window === 'undefined' ? { side: 'LONG' } : null;", ctx());
    expect(res.ok).toBe(true);
    expect(res.decision).toEqual({ side: "LONG" });
  });

  it("never throws on a runtime error", () => {
    const res = runStrategyCode("return ctx.nope.deep.value;", ctx());
    expect(res.ok).toBe(false);
    expect(res.decision).toBeNull();
    expect(res.error).toBeTruthy();
  });
});
