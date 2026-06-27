// Ready-to-insert strategy snippets for the code editor.
// Each snippet must transpile cleanly with transpileStrategy().

import type { StrategyLanguage } from "./custom-strategy";

export type Snippet = {
  id: string;
  label: string;
  language: StrategyLanguage;
  code: string;
};

export const STRATEGY_SNIPPETS: Snippet[] = [
  // JavaScript
  {
    id: "js-trend-pullback",
    label: "Trend pullback (RSI + SMA)",
    language: "javascript",
    code: `function decide(ctx) {
  // Long when price is above the 50-SMA and RSI is oversold.
  if (ctx.sma50 && ctx.price > ctx.sma50 && ctx.rsi14 !== null && ctx.rsi14 < 35) {
    return { side: "LONG", stopLossPct: 0.5, targetRatio: 2 };
  }
  return null;
}`,
  },
  {
    id: "js-macd-momentum",
    label: "MACD momentum",
    language: "javascript",
    code: `function decide(ctx) {
  // Long when MACD is positive and price is above the 20-SMA (short-term uptrend).
  if (ctx.macd !== null && ctx.macd > 0 && ctx.sma20 && ctx.price > ctx.sma20) {
    return { side: "LONG", stopLossPct: 0.6, targetRatio: 2 };
  }
  // Short when MACD is negative and price is below the 20-SMA.
  if (ctx.macd !== null && ctx.macd < 0 && ctx.sma20 && ctx.price < ctx.sma20) {
    return { side: "SHORT", stopLossPct: 0.6, targetRatio: 2 };
  }
  return null;
}`,
  },
  {
    id: "js-atr-breakout",
    label: "Volatility breakout (ATR)",
    language: "javascript",
    code: `function decide(ctx) {
  // Enter LONG on a strong day with high range position and acceptable volatility.
  const highVolatility = ctx.atrPct !== null && ctx.atrPct > 1.5;
  if (highVolatility && ctx.rangePosition !== null && ctx.rangePosition > 80) {
    return { side: "LONG", stopLossPct: ctx.atrPct ?? 0.5, targetRatio: 2 };
  }
  return null;
}`,
  },

  // Python
  {
    id: "py-trend-pullback",
    label: "Trend pullback (RSI + SMA)",
    language: "python",
    code: `def decide(ctx):
    # Long when price is above the 50-SMA and RSI is oversold.
    if ctx["sma50"] and ctx["price"] > ctx["sma50"] and ctx["rsi14"] is not None and ctx["rsi14"] < 35:
        return {"side": "LONG", "stopLossPct": 0.5, "targetRatio": 2}
    return None`,
  },
  {
    id: "py-dual-ma",
    label: "Dual MA crossover",
    language: "python",
    code: `def decide(ctx):
    # Long when fast MA (EMA 12) is above slow MA (EMA 26).
    if ctx["ema12"] is not None and ctx["ema26"] is not None:
        if ctx["ema12"] > ctx["ema26"] and ctx["price"] > ctx["ema12"]:
            return {"side": "LONG", "stopLossPct": 0.5, "targetRatio": 2}
        elif ctx["ema12"] < ctx["ema26"] and ctx["price"] < ctx["ema12"]:
            return {"side": "SHORT", "stopLossPct": 0.5, "targetRatio": 2}
    return None`,
  },

  // Pine Script
  {
    id: "pine-sma-rsi",
    label: "SMA crossover + RSI filter",
    language: "pinescript",
    code: `//@version=5
strategy("SMA Cross + RSI", overlay=true)

fastMA = ta.sma(close, 20)
slowMA = ta.sma(close, 50)
myRsi  = ta.rsi(close, 14)

longCondition  = ta.crossover(fastMA, slowMA) and myRsi < 60
shortCondition = ta.crossunder(fastMA, slowMA) and myRsi > 40

if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)`,
  },
  {
    id: "pine-rsi-mean-reversion",
    label: "RSI mean reversion",
    language: "pinescript",
    code: `//@version=5
strategy("RSI Mean Reversion", overlay=true)

myRsi = ta.rsi(close, 14)
trendMA = ta.sma(close, 200)

longCondition  = myRsi < 30 and close > trendMA
shortCondition = myRsi > 70 and close < trendMA

if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)`,
  },

  // TradingView
  {
    id: "tv-sma-crossover",
    label: "SMA crossover strategy",
    language: "tradingview",
    code: `//@version=5
strategy("SMA Crossover", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

fastLength = 20
slowLength = 50

fastMA = ta.sma(close, 20)
slowMA = ta.sma(close, 50)

longCondition  = ta.crossover(fastMA, slowMA)
shortCondition = ta.crossunder(fastMA, slowMA)

if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)

plot(fastMA, title="Fast MA", color=color.green)
plot(slowMA, title="Slow MA", color=color.red)`,
  },
  {
    id: "tv-rsi-ema",
    label: "RSI + EMA trend filter",
    language: "tradingview",
    code: `//@version=5
strategy("RSI + EMA", overlay=true)

trendEMA  = ta.ema(close, 26)
signalEMA = ta.ema(close, 12)
myRsi     = ta.rsi(close, 14)

longCondition  = signalEMA > trendEMA and myRsi < 50
shortCondition = signalEMA < trendEMA and myRsi > 50

strategy.entry("Long",  strategy.long,  when = longCondition)
strategy.entry("Short", strategy.short, when = shortCondition)`,
  },
];

/** Return snippets for the active language. */
export function snippetsForLanguage(language: StrategyLanguage): Snippet[] {
  return STRATEGY_SNIPPETS.filter((s) => s.language === language);
}
