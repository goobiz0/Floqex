import { describe, it, expect } from "vitest";
import { transpileStrategy, runTranspiled, pythonToJs } from "./transpile";
import type { IndicatorContext } from "./indicators";

function ctx(over: Partial<IndicatorContext> = {}): IndicatorContext {
  return {
    price: 100, prevClose: 98, changePct: 2, dayHigh: 101, dayLow: 97, rangePosition: 75,
    sma20: 99, sma50: 95, sma200: 90, ema12: 99.5, ema26: 98, macd: 1.5,
    rsi14: 40, atr14: 1.2, atrPct: 1.2, volume: 1_000_000,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// JavaScript passthrough
// ---------------------------------------------------------------------------

describe("transpileStrategy (javascript)", () => {
  it("compiles and runs a valid JS strategy", () => {
    const result = transpileStrategy("javascript", "function decide(ctx){ return ctx.price > ctx.sma50 ? {side:'LONG'} : null; }");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run(ctx())).toEqual({ side: "LONG" });
    expect(result.mapping).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.summary.long).toMatch(/executes directly/);
  });

  it("returns error for invalid JS syntax", () => {
    const result = transpileStrategy("javascript", "function decide(ctx){ return ) }");
    expect(result.ok).toBe(false);
  });

  it("returns null when conditions not met", () => {
    const result = transpileStrategy("javascript", "function decide(ctx){ if (ctx.rsi14 < 20) return {side:'LONG'}; return null; }");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run(ctx({ rsi14: 50 }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Python transpiler
// ---------------------------------------------------------------------------

describe("pythonToJs", () => {
  it("converts a simple decide function", () => {
    const py = `def decide(ctx):
    if ctx["sma50"] and ctx["price"] > ctx["sma50"]:
        return {"side": "LONG"}
    return None`;
    const result = pythonToJs(py);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.js).toContain("function decide(ctx)");
    expect(result.js).toContain("null");
  });

  it("converts True/False/None literals", () => {
    const py = `def decide(ctx):
    if ctx["rsi14"] is not None and ctx["rsi14"] < 35:
        return {"side": "LONG", "stopLossPct": 0.5}
    return None`;
    const result = pythonToJs(py);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.js).toContain("!== null");
    expect(result.js).toContain("null");
  });

  it("converts nested if/elif/else", () => {
    const py = `def decide(ctx):
    if ctx["rsi14"] is not None and ctx["rsi14"] < 30:
        return {"side": "LONG"}
    elif ctx["rsi14"] is not None and ctx["rsi14"] > 70:
        return {"side": "SHORT"}
    else:
        return None`;
    const result = pythonToJs(py);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.js).toContain("else if");
    expect(result.js).toContain("} else {");
  });

  it("rejects f-strings", () => {
    const py = `def decide(ctx):
    x = f"hello {ctx['price']}"
    return None`;
    const result = pythonToJs(py);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("f-string");
  });

  it("rejects list comprehensions", () => {
    const py = `def decide(ctx):
    x = [i for i in range(10)]
    return None`;
    const result = pythonToJs(py);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("comprehension");
  });

  it("rejects import statements", () => {
    const py = `import numpy as np
def decide(ctx):
    return None`;
    const result = pythonToJs(py);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("import");
  });
});

describe("transpileStrategy (python)", () => {
  const PY_TEMPLATE = `# Return {"side": "LONG"} / {"side": "SHORT"} to enter, or None to stay flat.
def decide(ctx):
    if ctx["sma50"] and ctx["price"] > ctx["sma50"] and ctx["rsi14"] is not None and ctx["rsi14"] < 35:
        return {"side": "LONG", "stopLossPct": 0.5, "targetRatio": 2}
    return None`;

  it("transpiles and runs the Python template", () => {
    const result = transpileStrategy("python", PY_TEMPLATE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // With rsi14 < 35: should return LONG
    const decision = result.run(ctx({ rsi14: 30 }));
    expect(decision).toEqual({ side: "LONG", stopLossPct: 0.5, targetRatio: 2 });
  });

  it("returns null when conditions not met", () => {
    const result = transpileStrategy("python", PY_TEMPLATE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run(ctx({ rsi14: 60 }))).toBeNull();
  });

  it("returns null when sma50 is null", () => {
    const result = transpileStrategy("python", PY_TEMPLATE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run(ctx({ sma50: null, rsi14: 30 }))).toBeNull();
  });

  it("returns error for unsupported Python construct", () => {
    const result = transpileStrategy("python", "import os\ndef decide(ctx): return None");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Unsupported Python construct");
  });
});

// ---------------------------------------------------------------------------
// Pine Script parser
// ---------------------------------------------------------------------------

describe("transpileStrategy (pinescript)", () => {
  it("parses longCondition/shortCondition variables", () => {
    const pine = `//@version=5
longCondition = ta.crossover(close, ta.sma(close, 50)) and ta.rsi(close, 14) < 35
if (longCondition)
    strategy.entry("Long", strategy.long)`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // crossover is a > b, so with price (100) > sma50 (95) and rsi14 (40) > 35 -> LONG? No: rsi14 < 35 is false
    expect(result.run(ctx({ rsi14: 40 }))).toBeNull();
    // With rsi14 = 30: conditions met
    expect(result.run(ctx({ rsi14: 30 }))).toEqual({ side: "LONG" });
    expect(result.mapping.length).toBeGreaterThan(0);
  });

  it("handles strategy.entry with when= clause", () => {
    const pine = `//@version=5
strategy("My Strat", overlay=true)
strategy.entry("Long", strategy.long, when = ta.rsi(close, 14) < 30)
strategy.entry("Short", strategy.short, when = ta.rsi(close, 14) > 70)`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run(ctx({ rsi14: 25 }))).toEqual({ side: "LONG" });
    expect(result.run(ctx({ rsi14: 75 }))).toEqual({ side: "SHORT" });
    expect(result.run(ctx({ rsi14: 50 }))).toBeNull();
  });

  it("handles and/or in conditions", () => {
    const pine = `longCondition = ta.rsi(close, 14) < 40 and close > ta.sma(close, 50)
shortCondition = ta.rsi(close, 14) > 60 or close < ta.sma(close, 50)`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // rsi=30 < 40 and price=100 > sma50=95 -> LONG
    expect(result.run(ctx({ rsi14: 30 }))).toEqual({ side: "LONG" });
    // rsi=65 > 60 -> SHORT
    expect(result.run(ctx({ rsi14: 65 }))).toEqual({ side: "SHORT" });
  });

  it("variable substitution works", () => {
    const pine = `//@version=5
fastMa = ta.sma(close, 20)
slowMa = ta.sma(close, 50)
longCondition = close > fastMa and fastMa > slowMa`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // price=100 > sma20=99 and sma20=99 > sma50=95 -> LONG
    expect(result.run(ctx())).toEqual({ side: "LONG" });
  });

  it("null indicator makes comparison false", () => {
    const pine = `longCondition = ta.sma(close, 200) > 100`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // sma200 is null -> comparison false -> no trade
    expect(result.run(ctx({ sma200: null }))).toBeNull();
    // sma200 = 95 < 100 -> false
    expect(result.run(ctx({ sma200: 95 }))).toBeNull();
    // sma200 = 105 > 100 -> LONG
    expect(result.run(ctx({ sma200: 105 }))).toEqual({ side: "LONG" });
  });

  it("warns on RSI period != 14", () => {
    const pine = `longCondition = ta.rsi(close, 21) < 30`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toContain("RSI length 21 approximated by rsi14");
  });

  it("returns error for unsupported SMA period", () => {
    const pine = `longCondition = ta.sma(close, 100) > close`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("ta.sma period 100");
  });

  it("returns error for open usage", () => {
    const pine = `longCondition = open > close`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("`open`");
  });

  it("includes mapping and summary", () => {
    const pine = `longCondition = ta.rsi(close, 14) < 30 and close > ta.sma(close, 50)`;
    const result = transpileStrategy("pinescript", pine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mapping.length).toBeGreaterThan(0);
    expect(result.summary.long).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TradingView (same Pine parser, tolerates strategy()/plot() noise)
// ---------------------------------------------------------------------------

describe("transpileStrategy (tradingview)", () => {
  it("handles a full exported TradingView strategy with noise", () => {
    const pine = `//@version=5
strategy("SMA + RSI", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

fastLength = 20
slowLength = 50
rsiLength = 14
rsiOversold = 30

fastMA = ta.sma(close, 20)
slowMA = ta.sma(close, 50)
myRsi = ta.rsi(close, 14)

longCondition = ta.crossover(fastMA, slowMA) and myRsi < rsiOversold
shortCondition = ta.crossunder(fastMA, slowMA)

if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)

plot(fastMA, color=color.blue)
plot(slowMA, color=color.red)`;

    const result = transpileStrategy("tradingview", pine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((w) => w.includes("crossover"))).toBe(true);
    expect(result.mapping.length).toBeGreaterThan(0);
    // With rsi14 = 25 and sma20 = 99 > sma50 = 95 (crossover approx = sma20 > sma50): LONG
    expect(result.run(ctx({ rsi14: 25, sma20: 99, sma50: 95 }))).toEqual({ side: "LONG" });
  });
});

// ---------------------------------------------------------------------------
// runTranspiled convenience
// ---------------------------------------------------------------------------

describe("runTranspiled", () => {
  it("returns null on transpile error", () => {
    expect(runTranspiled("python", "import os\ndef decide(ctx): return None", ctx())).toBeNull();
  });

  it("runs a valid strategy", () => {
    const code = "function decide(ctx){ return { side: 'SHORT' }; }";
    expect(runTranspiled("javascript", code, ctx())).toEqual({ side: "SHORT" });
  });
});
