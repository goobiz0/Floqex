/**
 * Canonical Strategy parameter contract — the single source of truth for the
 * tunable ORB parameters, their safe bounds, and labels. Used by the Strategy
 * Lab UI (to render controls) AND by the server action (to validate before
 * persisting), so risk ceilings are enforced server-side and cannot be bypassed
 * by editing the client or calling the action directly.
 *
 * Bounds mirror the Risk Management spec: risk/trade 0.1–2% (hard ceiling 2%),
 * daily loss 1–5% (hard ceiling 5%), max trades/day 1–20, etc.
 */

export type StrategyParams = {
  rangeMinutes: number;
  rrTarget: number;
  minRange: number;
  maxRange: number;
  riskPct: number;
  dailyLoss: number;
  maxTrades: number;
  trendFilter: boolean;
  reEntry: boolean;
  trailingStopPct: number;
  minVolume: number;
  newsPause: boolean;
  extendedHours: boolean;
  /** Stop distance as a % of entry. Tolerant/optional so legacy ORB rows that
   *  never stored it keep validating; defaults applied when absent. */
  stopLossPct: number;
  /** ATR-based stop distance multiple (stop = ATR × this). 0 keeps the fixed
   *  percentage stop; > 0 lets the stop scale with realised volatility. */
  atrStopMultiple: number;
  [key: string]: unknown;
};

export type NumericParam =
  | "rangeMinutes"
  | "rrTarget"
  | "minRange"
  | "maxRange"
  | "riskPct"
  | "dailyLoss"
  | "maxTrades"
  | "trailingStopPct"
  | "minVolume";

export type Bound = {
  min: number;
  max: number;
  step: number;
  label: string;
  suffix?: string;
  help: string;
};

export const PARAM_BOUNDS: Record<NumericParam, Bound> = {
  rangeMinutes: {
    min: 5,
    max: 60,
    step: 1,
    label: "Opening range window",
    suffix: "min",
    help: "Length of the opening range captured at session start.",
  },
  rrTarget: {
    min: 1,
    max: 5,
    step: 0.1,
    label: "Reward to risk target",
    suffix: "R",
    help: "Profit target as a multiple of the risk.",
  },
  minRange: {
    min: 0.1,
    max: 1,
    step: 0.05,
    label: "Min range filter",
    suffix: "x",
    help: "Skip sessions where the range is smaller than this multiple of a normal day.",
  },
  maxRange: {
    min: 1.5,
    max: 5,
    step: 0.1,
    label: "Max range filter",
    suffix: "x",
    help: "Skip sessions where the range is larger than this (usually news driven).",
  },
  riskPct: {
    min: 0.1,
    max: 2,
    step: 0.1,
    label: "Risk per trade",
    suffix: "%",
    help: "Hard ceiling 2%. Position size is derived from the stop distance.",
  },
  dailyLoss: {
    min: 1,
    max: 5,
    step: 0.5,
    label: "Daily loss limit",
    suffix: "%",
    help: "Trading halts for the day once this is hit. Hard ceiling 5%.",
  },
  maxTrades: {
    min: 1,
    max: 20,
    step: 1,
    label: "Max trades per day",
    help: "Across both sessions. Caps overtrading.",
  },
  trailingStopPct: {
    min: 0,
    max: 5,
    step: 0.1,
    label: "Trailing Stop Loss",
    suffix: "%",
    help: "Trails the price by this percentage to lock in profits. 0 disables.",
  },
  minVolume: {
    min: 1000,
    max: 10000000,
    step: 1000,
    label: "Min Pre-Market Volume",
    suffix: " shares",
    help: "Minimum volume required before considering a setup.",
  },
};

/**
 * Optional, tolerant numeric params. Unlike `PARAM_BOUNDS` these are NOT part of
 * the strict required-keys contract — a payload that omits them is still valid
 * (the default applies). When present they are clamped, never rejected, so the
 * Strategy Lab and template builders can opt into a wider stop or ATR scaling
 * without every legacy caller having to supply them.
 */
export const OPTIONAL_PARAM_BOUNDS = {
  stopLossPct: {
    min: 0.05,
    max: 20,
    step: 0.05,
    label: "Stop loss distance",
    suffix: "%",
    help: "Stop distance as a percentage of entry. Wider stops survive normal noise; tighter stops risk less per trade but get shaken out more.",
  },
  atrStopMultiple: {
    min: 0,
    max: 5,
    step: 0.1,
    label: "ATR stop multiple",
    suffix: "× ATR",
    help: "Scale the stop with realised volatility (stop = ATR × this). 0 keeps the fixed percentage stop.",
  },
} as const satisfies Record<string, Bound>;

export type OptionalNumericParam = keyof typeof OPTIONAL_PARAM_BOUNDS;
const OPTIONAL_NUMERIC_KEYS = Object.keys(OPTIONAL_PARAM_BOUNDS) as OptionalNumericParam[];

export const PARAM_LABELS: Record<keyof StrategyParams, string> = {
  rangeMinutes: PARAM_BOUNDS.rangeMinutes.label,
  rrTarget: PARAM_BOUNDS.rrTarget.label,
  minRange: PARAM_BOUNDS.minRange.label,
  maxRange: PARAM_BOUNDS.maxRange.label,
  riskPct: PARAM_BOUNDS.riskPct.label,
  dailyLoss: PARAM_BOUNDS.dailyLoss.label,
  maxTrades: PARAM_BOUNDS.maxTrades.label,
  trailingStopPct: PARAM_BOUNDS.trailingStopPct.label,
  minVolume: PARAM_BOUNDS.minVolume.label,
  trendFilter: "Trend filter",
  reEntry: "Re-entry rule",
  newsPause: "News event pause",
  extendedHours: "Extended hours trading",
  stopLossPct: OPTIONAL_PARAM_BOUNDS.stopLossPct.label,
  atrStopMultiple: OPTIONAL_PARAM_BOUNDS.atrStopMultiple.label,
};

// Calibrated defaults. A 0.75% stop survives a normal session's noise (a 0.5%
// stop on an instrument with ~0.8-1.2% ATR is hit before the trade can work),
// an RR of 1.8 is reachable on the majority of trending days, and a 0.2x range
// floor keeps quiet-day scratch trades out without over-filtering. See the
// validation engine for the data behind these numbers.
export const DEFAULT_PARAMS: StrategyParams = {
  rangeMinutes: 15,
  rrTarget: 1.8,
  minRange: 0.2,
  maxRange: 3,
  riskPct: 1,
  dailyLoss: 3,
  maxTrades: 8,
  trailingStopPct: 0.5,
  minVolume: 100000,
  trendFilter: true,
  reEntry: true,
  newsPause: true,
  extendedHours: false,
  stopLossPct: 0.75,
  atrStopMultiple: 1.5,
};

const NUMERIC_KEYS = Object.keys(PARAM_BOUNDS) as NumericParam[];

/**
 * Validate untrusted input and reject anything outside the declared bounds.
 * This is the server-side guard: the bot's risk ceilings cannot be widened by a
 * crafted request. Returns the clean params or a human-readable error.
 */
export function parseStrategyParams(
  input: unknown,
): { ok: true; params: StrategyParams } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Invalid parameters." };
  }
  const o = input as Record<string, unknown>;
  const out = { ...DEFAULT_PARAMS };

  for (const key of NUMERIC_KEYS) {
    const bound = PARAM_BOUNDS[key];
    const value = Number(o[key]);
    if (!Number.isFinite(value)) {
      return { ok: false, error: `${bound.label} must be a number.` };
    }
    if (value < bound.min || value > bound.max) {
      return {
        ok: false,
        error: `${bound.label} must be between ${bound.min} and ${bound.max}${bound.suffix ?? ""}.`,
      };
    }
    out[key] = value;
  }

  out.trendFilter = Boolean(o.trendFilter);
  out.reEntry = Boolean(o.reEntry);
  out.newsPause = Boolean(o.newsPause);
  out.extendedHours = Boolean(o.extendedHours);

  // Optional numeric params: clamp into bounds when present, otherwise keep the
  // default. Never reject — these are additive and may be absent on legacy rows.
  for (const key of OPTIONAL_NUMERIC_KEYS) {
    const bound = OPTIONAL_PARAM_BOUNDS[key];
    const value = Number(o[key]);
    if (Number.isFinite(value)) {
      out[key] = Math.min(bound.max, Math.max(bound.min, value));
    }
  }

  // Custom parameters
  for (const key of Object.keys(o)) {
    if (
      !NUMERIC_KEYS.includes(key as NumericParam) &&
      !OPTIONAL_NUMERIC_KEYS.includes(key as OptionalNumericParam) &&
      key !== "trendFilter" && key !== "reEntry" && key !== "newsPause" && key !== "extendedHours"
    ) {
      out[key] = o[key];
    }
  }

  return { ok: true, params: out };
}

/**
 * Coerce a stored JSON value into safe params for display, clamping each field
 * into bounds and falling back to defaults for anything missing or malformed.
 */
export function coerceStrategyParams(input: unknown): StrategyParams {
  const o = (input ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_PARAMS };
  for (const key of NUMERIC_KEYS) {
    const bound = PARAM_BOUNDS[key];
    const value = Number(o[key]);
    if (Number.isFinite(value)) {
      out[key] = Math.min(bound.max, Math.max(bound.min, value));
    }
  }
  if (typeof o.trendFilter === "boolean") out.trendFilter = o.trendFilter;
  if (typeof o.reEntry === "boolean") out.reEntry = o.reEntry;
  if (typeof o.newsPause === "boolean") out.newsPause = o.newsPause;
  if (typeof o.extendedHours === "boolean") out.extendedHours = o.extendedHours;

  for (const key of OPTIONAL_NUMERIC_KEYS) {
    const bound = OPTIONAL_PARAM_BOUNDS[key];
    const value = Number(o[key]);
    if (Number.isFinite(value)) {
      out[key] = Math.min(bound.max, Math.max(bound.min, value));
    }
  }

  for (const key of Object.keys(o)) {
    if (
      !NUMERIC_KEYS.includes(key as NumericParam) &&
      !OPTIONAL_NUMERIC_KEYS.includes(key as OptionalNumericParam) &&
      key !== "trendFilter" && key !== "reEntry" && key !== "newsPause" && key !== "extendedHours"
    ) {
      out[key] = o[key];
    }
  }

  return out;
}

/** Format a param value for the change log (adds the unit suffix). */
export function formatParamValue(key: keyof StrategyParams, value: number | boolean): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  const suffix =
    key in PARAM_BOUNDS
      ? (PARAM_BOUNDS[key as NumericParam].suffix ?? "")
      : key in OPTIONAL_PARAM_BOUNDS
        ? (OPTIONAL_PARAM_BOUNDS[key as OptionalNumericParam].suffix ?? "")
        : "";
  return `${value}${suffix}`;
}

const BOOLEAN_KEYS = new Set<keyof StrategyParams>(["trendFilter", "reEntry", "newsPause", "extendedHours"]);

/** Serialize a param value to a raw, round-trippable string for storage. */
export function rawParamValue(key: keyof StrategyParams, value: number | boolean): string {
  return typeof value === "boolean" ? (value ? "true" : "false") : String(value);
}

/** Parse a stored raw param value back into its typed form. */
export function parseRawParamValue(key: keyof StrategyParams, raw: string): number | boolean {
  return BOOLEAN_KEYS.has(key) ? raw === "true" : Number(raw);
}

/**
 * Apply a single raw parameter change onto a params object, validating the
 * result against the full schema (bounds enforced). Returns the clean params or
 * an error — used when approving a bot suggestion so the value actually takes
 * effect, within the same safety envelope as a manual save.
 */
export function applyRawParam(
  current: StrategyParams,
  key: string | null,
  raw: string,
): { ok: true; params: StrategyParams } | { ok: false; error: string } {
  if (!key) {
    return { ok: false, error: "Missing parameter key." };
  }
  const k = key as keyof StrategyParams;
  return parseStrategyParams({ ...current, [k]: parseRawParamValue(k, raw) });
}

/**
 * Format a raw stored value for display. Tolerant of legacy rows that may have
 * stored a pre-formatted string or an unknown key (returns the raw text as-is).
 */
export function displayParamValue(key: string | null, raw: string): string {
  if (!key || !(key in PARAM_LABELS)) return raw;
  const k = key as keyof StrategyParams;
  if (BOOLEAN_KEYS.has(k)) {
    if (raw === "true") return "On";
    if (raw === "false") return "Off";
    return raw;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? formatParamValue(k, n) : raw;
}
