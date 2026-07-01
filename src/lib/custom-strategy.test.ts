import { describe, it, expect } from "vitest";
import {
  evaluateBuilder,
  evaluateCondition,
  evaluateGroup,
  parseCustomConfig,
  parseInstruments,
  parseDirection,
  instrumentsFromParams,
  instrumentsForBot,
  mirrorGroups,
  defaultBuilderConfig,
  type Condition,
  type ConditionGroup,
} from "./custom-strategy";
import type { IndicatorContext } from "./engine/indicators";

function ctx(over: Partial<IndicatorContext> = {}): IndicatorContext {
  return {
    price: 100, prevClose: 98, changePct: 2, dayHigh: 101, dayLow: 97, rangePosition: 75,
    sma20: 99, sma50: 95, sma200: 90, ema12: 99.5, ema26: 98, macd: 1.5,
    rsi14: 40, atr14: 1.2, atrPct: 1.2, volume: 1_000_000,
    ...over,
  };
}

describe("evaluateCondition", () => {
  it("compares an indicator to another indicator", () => {
    const c: Condition = { left: "price", op: ">", right: { kind: "indicator", key: "sma50" } };
    expect(evaluateCondition(c, ctx())).toBe(true);
    expect(evaluateCondition(c, ctx({ price: 90 }))).toBe(false);
  });

  it("compares an indicator to a fixed value", () => {
    const c: Condition = { left: "rsi14", op: "<", right: { kind: "value", value: 30 } };
    expect(evaluateCondition(c, ctx({ rsi14: 25 }))).toBe(true);
    expect(evaluateCondition(c, ctx({ rsi14: 55 }))).toBe(false);
  });

  it("treats a null indicator as not met", () => {
    const c: Condition = { left: "sma200", op: ">", right: { kind: "value", value: 1 } };
    expect(evaluateCondition(c, ctx({ sma200: null }))).toBe(false);
  });
});

describe("evaluateGroup / evaluateBuilder", () => {
  const aboveSma: Condition = { left: "price", op: ">", right: { kind: "indicator", key: "sma50" } };
  const oversold: Condition = { left: "rsi14", op: "<", right: { kind: "value", value: 35 } };

  it("ALL requires every condition; ANY requires one", () => {
    const all: ConditionGroup = { join: "ALL", conditions: [aboveSma, oversold] };
    const any: ConditionGroup = { join: "ANY", conditions: [aboveSma, oversold] };
    expect(evaluateGroup(all, ctx({ rsi14: 50 }))).toBe(false);
    expect(evaluateGroup(any, ctx({ rsi14: 50 }))).toBe(true);
  });

  it("AND-joins groups", () => {
    const groups: ConditionGroup[] = [
      { join: "ALL", conditions: [aboveSma] },
      { join: "ALL", conditions: [oversold] },
    ];
    expect(evaluateBuilder(groups, ctx({ rsi14: 30 }))).toBe(true);
    expect(evaluateBuilder(groups, ctx({ rsi14: 60 }))).toBe(false);
  });

  it("an empty builder never enters", () => {
    expect(evaluateBuilder([], ctx())).toBe(false);
    expect(evaluateGroup({ join: "ALL", conditions: [] }, ctx())).toBe(false);
  });
});

describe("parseInstruments", () => {
  it("uppercases, de-dupes and accepts arrays or a single value", () => {
    expect(parseInstruments(["aapl", "AAPL", "btc"])).toEqual(["AAPL", "BTC"]);
    expect(parseInstruments("nq")).toEqual(["NQ"]);
    expect(parseInstruments(null)).toEqual([]);
  });
});

describe("instrumentsFromParams", () => {
  it("prefers instruments[], falls back to instrument, then NQ", () => {
    expect(instrumentsFromParams({ instruments: ["ES", "BTC"] })).toEqual(["ES", "BTC"]);
    expect(instrumentsFromParams({ instrument: "AAPL" })).toEqual(["AAPL"]);
    expect(instrumentsFromParams({})).toEqual(["NQ"]);
  });
});

describe("instrumentsForBot", () => {
  it("uses the bot's assets when it has them", () => {
    expect(instrumentsForBot(["tsla", "AMD"], { instruments: ["ES"] })).toEqual(["TSLA", "AMD"]);
  });
  it("falls back to the strategy params for legacy bots, then NQ", () => {
    expect(instrumentsForBot([], { instruments: ["ES"] })).toEqual(["ES"]);
    expect(instrumentsForBot(null, {})).toEqual(["NQ"]);
  });
});

describe("parseDirection", () => {
  it("defaults to BOTH and only accepts the three known values", () => {
    expect(parseDirection("LONG")).toBe("LONG");
    expect(parseDirection("SHORT")).toBe("SHORT");
    expect(parseDirection("BOTH")).toBe("BOTH");
    expect(parseDirection(undefined)).toBe("BOTH");
    expect(parseDirection("sideways")).toBe("BOTH");
  });
});

describe("mirrorGroups", () => {
  it("flips every comparison and preserves the join and operands", () => {
    const groups: ConditionGroup[] = [
      {
        join: "ALL",
        conditions: [
          { left: "price", op: ">", right: { kind: "indicator", key: "sma50" } },
          { left: "rsi14", op: "<", right: { kind: "value", value: 40 } },
        ],
      },
    ];
    const mirrored = mirrorGroups(groups);
    expect(mirrored[0].join).toBe("ALL");
    expect(mirrored[0].conditions[0].op).toBe("<");
    expect(mirrored[0].conditions[1].op).toBe(">");
    // Operands are untouched, only the comparison flips.
    expect(mirrored[0].conditions[1].right).toEqual({ kind: "value", value: 40 });
  });
});

describe("parseCustomConfig", () => {
  it("validates a builder config", () => {
    const res = parseCustomConfig({
      mode: "BUILDER",
      instruments: ["AAPL", "MSFT"],
      direction: "LONG",
      stopLossPct: 0.5,
      targetRatio: 2,
      groups: [{ join: "ALL", conditions: [{ left: "price", op: ">", right: { kind: "indicator", key: "sma50" } }] }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.instruments).toEqual(["AAPL", "MSFT"]);
      expect(res.config.mode).toBe("BUILDER");
    }
  });

  it("allows a config with no instruments (assets live on the bot now)", () => {
    const res = parseCustomConfig({
      mode: "BUILDER",
      instruments: [],
      direction: "LONG",
      groups: [{ join: "ALL", conditions: [{ left: "price", op: ">", right: { kind: "indicator", key: "sma50" } }] }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.instruments).toEqual([]);
  });

  it("parses a BOTH-direction builder with a separate short ruleset", () => {
    const res = parseCustomConfig({
      mode: "BUILDER",
      direction: "BOTH",
      groups: [{ join: "ALL", conditions: [{ left: "price", op: ">", right: { kind: "indicator", key: "sma50" } }] }],
      shortGroups: [{ join: "ALL", conditions: [{ left: "price", op: "<", right: { kind: "indicator", key: "sma50" } }] }],
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.config.mode === "BUILDER") {
      expect(res.config.direction).toBe("BOTH");
      expect(res.config.shortGroups?.length).toBe(1);
    }
  });

  it("mirrors the long rules into shorts for a BOTH builder when none is supplied", () => {
    const res = parseCustomConfig({
      mode: "BUILDER",
      direction: "BOTH",
      groups: [{ join: "ALL", conditions: [{ left: "price", op: ">", right: { kind: "indicator", key: "sma50" } }] }],
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.config.mode === "BUILDER") {
      expect(res.config.shortGroups?.length).toBe(1);
      // "price > sma50" (long) mirrors to "price < sma50" (short).
      expect(res.config.shortGroups?.[0].conditions[0].op).toBe("<");
    }
  });

  it("rejects a builder with no valid conditions", () => {
    const res = parseCustomConfig({ mode: "BUILDER", instruments: ["AAPL"], groups: [{ join: "ALL", conditions: [{ left: "bogus", op: "!!", right: {} }] }] });
    expect(res.ok).toBe(false);
  });

  it("validates a JavaScript code config and clamps risk", () => {
    const res = parseCustomConfig({
      mode: "CODE",
      language: "javascript",
      instruments: ["BTC"],
      code: "function decide(ctx){ return ctx.rsi14 < 30 ? { side: 'LONG' } : null; }",
      stopLossPct: 999,
      targetRatio: 2,
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.config.mode === "CODE") {
      expect(res.config.stopLossPct).toBe(20); // clamped
      expect(res.config.language).toBe("javascript");
    }
  });

  it("accepts Python as a supported language", () => {
    const res = parseCustomConfig({
      mode: "CODE",
      language: "python",
      instruments: ["BTC"],
      code: "def decide(ctx):\n    return None",
    });
    // Python is now a supported language (requires Pro plan, enforced server-side)
    expect(res.ok).toBe(true);
  });

  it("rejects code that trips the static guard", () => {
    const res = parseCustomConfig({
      mode: "CODE",
      language: "javascript",
      instruments: ["BTC"],
      code: "return process.env;",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects empty code", () => {
    const res = parseCustomConfig({ mode: "CODE", language: "javascript", instruments: ["BTC"], code: "   " });
    expect(res.ok).toBe(false);
  });

  it("provides a sane default builder config", () => {
    const d = defaultBuilderConfig();
    expect(d.groups.length).toBe(1);
    expect(d.groups[0].conditions.length).toBe(1);
  });
});
