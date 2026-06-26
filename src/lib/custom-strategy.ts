// The advanced custom-signal contract, shared by the bot builder UI and the
// server validation + engine. A custom strategy is either:
//   - BUILDER: grouped indicator conditions (AND across groups, ALL/ANY within),
//   - CODE: user JavaScript (executes live) or another language (validated, beta).
// Everything here is pure so it is unit tested and safe to import anywhere.

import type { IndicatorContext } from "./engine/indicators";
import { staticGuard } from "./engine/sandbox";

export const MAX_INSTRUMENTS = 20;
export const MAX_GROUPS = 5;
export const MAX_CONDITIONS_PER_GROUP = 6;

// ---- Indicators available to the rule builder ----------------------------

export type IndicatorKey =
  | "price" | "prevClose" | "changePct" | "dayHigh" | "dayLow" | "rangePosition"
  | "sma20" | "sma50" | "sma200" | "ema12" | "ema26" | "macd"
  | "rsi14" | "atr14" | "atrPct" | "volume";

export type IndicatorMeta = {
  key: IndicatorKey;
  label: string;
  help: string;
  category: "Price" | "Trend" | "Momentum" | "Volatility" | "Volume";
  premium?: boolean;
};

export const INDICATORS: IndicatorMeta[] = [
  { key: "price", label: "Price", help: "The latest traded price.", category: "Price" },
  { key: "prevClose", label: "Previous close", help: "Yesterday's closing price.", category: "Price" },
  { key: "changePct", label: "Change since close", help: "Percent move from the previous close.", category: "Price" },
  { key: "dayHigh", label: "Day high", help: "Highest price so far today.", category: "Price" },
  { key: "dayLow", label: "Day low", help: "Lowest price so far today.", category: "Price" },
  { key: "rangePosition", label: "Range position", help: "Where price sits in today's range, 0 (low) to 100 (high).", category: "Price" },
  { key: "sma20", label: "SMA 20", help: "20-period simple moving average (short trend).", category: "Trend" },
  { key: "sma50", label: "SMA 50", help: "50-period simple moving average (medium trend).", category: "Trend" },
  { key: "sma200", label: "SMA 200", help: "200-period simple moving average (long trend).", category: "Trend", premium: true },
  { key: "ema12", label: "EMA 12", help: "12-period exponential moving average (fast).", category: "Trend" },
  { key: "ema26", label: "EMA 26", help: "26-period exponential moving average (slow).", category: "Trend" },
  { key: "macd", label: "MACD line", help: "EMA 12 minus EMA 26. Above zero is bullish momentum.", category: "Momentum", premium: true },
  { key: "rsi14", label: "RSI 14", help: "Relative Strength Index. Below 30 oversold, above 70 overbought.", category: "Momentum" },
  { key: "atr14", label: "ATR 14", help: "Average True Range, a measure of volatility in price terms.", category: "Volatility", premium: true },
  { key: "atrPct", label: "ATR %", help: "ATR as a percentage of price.", category: "Volatility", premium: true },
  { key: "volume", label: "Volume", help: "Shares or contracts traded today.", category: "Volume" },
];

const INDICATOR_KEY_SET = new Set<string>(INDICATORS.map((i) => i.key));
export function isIndicatorKey(k: string): k is IndicatorKey {
  return INDICATOR_KEY_SET.has(k);
}
export function indicatorMeta(key: string): IndicatorMeta | undefined {
  return INDICATORS.find((i) => i.key === key);
}

// ---- Operators -----------------------------------------------------------

export type Operator = ">" | "<" | ">=" | "<=" | "crossesUp" | "crossesDown";

export const OPERATORS: { key: Operator; label: string; help: string }[] = [
  { key: ">", label: "is above", help: "Left value is greater than the right." },
  { key: "<", label: "is below", help: "Left value is less than the right." },
  { key: ">=", label: "is at or above", help: "Left value is greater than or equal." },
  { key: "<=", label: "is at or below", help: "Left value is less than or equal." },
  { key: "crossesUp", label: "rises above", help: "Treated as 'is above' on the current tick." },
  { key: "crossesDown", label: "falls below", help: "Treated as 'is below' on the current tick." },
];
const OPERATOR_KEYS = new Set<string>(OPERATORS.map((o) => o.key));

// ---- Conditions & groups -------------------------------------------------

export type Comparand =
  | { kind: "indicator"; key: IndicatorKey }
  | { kind: "value"; value: number };

export type Condition = { left: IndicatorKey; op: Operator; right: Comparand };

export type GroupJoin = "ALL" | "ANY";
export type ConditionGroup = { join: GroupJoin; conditions: Condition[] };

export type StrategyLanguage = "javascript" | "python" | "pinescript";

export type BuilderConfig = {
  mode: "BUILDER";
  direction: "LONG" | "SHORT";
  groups: ConditionGroup[];
  stopLossPct: number;
  targetRatio: number;
};

export type CodeConfig = {
  mode: "CODE";
  language: StrategyLanguage;
  code: string;
  direction: "LONG" | "SHORT";
  stopLossPct: number;
  targetRatio: number;
};

export type CustomConfig = BuilderConfig | CodeConfig;

// ---- Languages -----------------------------------------------------------

export type LanguageMeta = {
  id: StrategyLanguage;
  label: string;
  /** True when the live engine executes this language today. */
  executesLive: boolean;
  badge: string;
  template: string;
};

const JS_TEMPLATE = `// Return { side: "LONG" } or { side: "SHORT" } to enter, or null to stay flat.
// 'ctx' holds the live indicators: price, sma20, sma50, sma200, ema12, ema26,
// macd, rsi14, atr14, atrPct, changePct, rangePosition, dayHigh, dayLow, volume.
// Any indicator can be null until there is enough data.

function decide(ctx) {
  // Example: buy oversold pullbacks that are still in an uptrend.
  if (ctx.sma50 && ctx.price > ctx.sma50 && ctx.rsi14 !== null && ctx.rsi14 < 35) {
    return { side: "LONG", stopLossPct: 0.5, targetRatio: 2 };
  }
  return null;
}`;

const PY_TEMPLATE = `# Return {"side": "LONG"} / {"side": "SHORT"} to enter, or None to stay flat.
# 'ctx' exposes the same indicators as the JavaScript runtime.

def decide(ctx):
    if ctx["sma50"] and ctx["price"] > ctx["sma50"] and ctx["rsi14"] is not None and ctx["rsi14"] < 35:
        return {"side": "LONG", "stopLossPct": 0.5, "targetRatio": 2}
    return None`;

const PINE_TEMPLATE = `//@version=5
// Pine-style intent. Validated on save; maps to engine indicators.
strategy("My Strategy", overlay=true)

longCondition = ta.crossover(close, ta.sma(close, 50)) and ta.rsi(close, 14) < 35
if (longCondition)
    strategy.entry("Long", strategy.long)`;

export const LANGUAGES: LanguageMeta[] = [
  { id: "javascript", label: "JavaScript", executesLive: true, badge: "Runs live", template: JS_TEMPLATE },
  { id: "python", label: "Python", executesLive: false, badge: "Beta", template: PY_TEMPLATE },
  { id: "pinescript", label: "Pine Script", executesLive: false, badge: "Beta", template: PINE_TEMPLATE },
];
export function languageMeta(id: string): LanguageMeta | undefined {
  return LANGUAGES.find((l) => l.id === id);
}

// ---- Evaluation (pure) ---------------------------------------------------

function ctxValue(ctx: IndicatorContext, key: IndicatorKey): number | null {
  const v = (ctx as unknown as Record<string, number | null>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function evaluateCondition(cond: Condition, ctx: IndicatorContext): boolean {
  const left = ctxValue(ctx, cond.left);
  if (left == null) return false;
  const right = cond.right.kind === "value" ? cond.right.value : ctxValue(ctx, cond.right.key);
  if (right == null || !Number.isFinite(right)) return false;
  switch (cond.op) {
    case ">":
    case "crossesUp":
      return left > right;
    case "<":
    case "crossesDown":
      return left < right;
    case ">=":
      return left >= right;
    case "<=":
      return left <= right;
    default:
      return false;
  }
}

export function evaluateGroup(group: ConditionGroup, ctx: IndicatorContext): boolean {
  if (!group.conditions.length) return false;
  if (group.join === "ANY") return group.conditions.some((c) => evaluateCondition(c, ctx));
  return group.conditions.every((c) => evaluateCondition(c, ctx));
}

/** All groups must hold (groups are AND-joined). Empty -> false (no trade). */
export function evaluateBuilder(groups: ConditionGroup[], ctx: IndicatorContext): boolean {
  if (!groups.length) return false;
  return groups.every((g) => evaluateGroup(g, ctx));
}

// ---- Defaults ------------------------------------------------------------

export function defaultGroup(): ConditionGroup {
  return { join: "ALL", conditions: [{ left: "price", op: ">", right: { kind: "indicator", key: "sma50" } }] };
}

export function defaultBuilderConfig(): BuilderConfig {
  return { mode: "BUILDER", direction: "LONG", groups: [defaultGroup()], stopLossPct: 0.5, targetRatio: 2 };
}

export function defaultCodeConfig(): CodeConfig {
  return { mode: "CODE", language: "javascript", code: JS_TEMPLATE, direction: "LONG", stopLossPct: 0.5, targetRatio: 2 };
}

// ---- Validation (server-trusted) -----------------------------------------

type ParseOk = { ok: true; config: CustomConfig; instruments: string[] };
type ParseErr = { ok: false; error: string };

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export function parseInstruments(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : input != null ? [input] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const sym = String(item ?? "").trim().toUpperCase();
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
    if (out.length >= MAX_INSTRUMENTS) break;
  }
  return out;
}

function parseCondition(input: unknown): Condition | null {
  if (typeof input !== "object" || input === null) return null;
  const o = input as Record<string, unknown>;
  const left = String(o.left ?? "");
  const op = String(o.op ?? "");
  if (!isIndicatorKey(left) || !OPERATOR_KEYS.has(op)) return null;
  const rightRaw = o.right as Record<string, unknown> | undefined;
  if (!rightRaw) return null;
  if (rightRaw.kind === "value") {
    const value = Number(rightRaw.value);
    if (!Number.isFinite(value)) return null;
    return { left, op: op as Operator, right: { kind: "value", value } };
  }
  const key = String(rightRaw.key ?? "");
  if (!isIndicatorKey(key)) return null;
  return { left, op: op as Operator, right: { kind: "indicator", key } };
}

/**
 * Validate untrusted custom-strategy input into a clean config plus the
 * instrument list. Rejects malformed rules and empty programs so the engine
 * always receives something it can evaluate.
 */
export function parseCustomConfig(input: unknown): ParseOk | ParseErr {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Invalid strategy." };
  const o = input as Record<string, unknown>;

  const instruments = parseInstruments(o.instruments ?? o.instrument);
  if (instruments.length === 0) return { ok: false, error: "Choose at least one asset for the bot to trade." };

  const direction = o.direction === "SHORT" ? "SHORT" : "LONG";
  const stopLossPct = clampNum(o.stopLossPct, 0.1, 20, 0.5);
  const targetRatio = clampNum(o.targetRatio, 0.25, 20, 2);
  const mode = o.mode === "CODE" ? "CODE" : "BUILDER";

  if (mode === "CODE") {
    const language = languageMeta(String(o.language)) ? (o.language as StrategyLanguage) : "javascript";
    const code = typeof o.code === "string" ? o.code : "";
    if (!code.trim()) return { ok: false, error: "Write some strategy code before deploying." };
    // Only languages the engine executes live are deployable, so a created bot
    // always functions. Beta languages can be authored and validated, but not
    // deployed until their runtime ships.
    if (language !== "javascript") {
      return {
        ok: false,
        error: `Live execution for ${languageMeta(language)?.label ?? language} is in beta. Switch to JavaScript to deploy this bot.`,
      };
    }
    const guard = staticGuard(code);
    if (guard) return { ok: false, error: guard };
    return { ok: true, instruments, config: { mode: "CODE", language, code, direction, stopLossPct, targetRatio } };
  }

  const groupsRaw = Array.isArray(o.groups) ? o.groups : [];
  const groups: ConditionGroup[] = [];
  for (const g of groupsRaw.slice(0, MAX_GROUPS)) {
    if (typeof g !== "object" || g === null) continue;
    const gv = g as Record<string, unknown>;
    const join: GroupJoin = gv.join === "ANY" ? "ANY" : "ALL";
    const condsRaw = Array.isArray(gv.conditions) ? gv.conditions : [];
    const conditions: Condition[] = [];
    for (const c of condsRaw.slice(0, MAX_CONDITIONS_PER_GROUP)) {
      const parsed = parseCondition(c);
      if (parsed) conditions.push(parsed);
    }
    if (conditions.length) groups.push({ join, conditions });
  }
  if (groups.length === 0) return { ok: false, error: "Add at least one valid entry condition." };

  return { ok: true, instruments, config: { mode: "BUILDER", direction, groups, stopLossPct, targetRatio } };
}

/**
 * Resolve the list of instruments a bot should trade from its stored params.
 * Backward compatible: honours a new `instruments` array, falls back to the
 * legacy single `instrument`, and finally to NQ so the engine always has a
 * symbol to act on.
 */
export function instrumentsFromParams(params: Record<string, unknown>): string[] {
  const list = parseInstruments(params.instruments ?? params.instrument);
  return list.length ? list : ["NQ"];
}
