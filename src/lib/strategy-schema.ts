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
};

export type NumericParam =
  | "rangeMinutes"
  | "rrTarget"
  | "minRange"
  | "maxRange"
  | "riskPct"
  | "dailyLoss"
  | "maxTrades";

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
};

export const PARAM_LABELS: Record<keyof StrategyParams, string> = {
  rangeMinutes: PARAM_BOUNDS.rangeMinutes.label,
  rrTarget: PARAM_BOUNDS.rrTarget.label,
  minRange: PARAM_BOUNDS.minRange.label,
  maxRange: PARAM_BOUNDS.maxRange.label,
  riskPct: PARAM_BOUNDS.riskPct.label,
  dailyLoss: PARAM_BOUNDS.dailyLoss.label,
  maxTrades: PARAM_BOUNDS.maxTrades.label,
  trendFilter: "Trend filter",
  reEntry: "Re-entry rule",
};

export const DEFAULT_PARAMS: StrategyParams = {
  rangeMinutes: 15,
  rrTarget: 2,
  minRange: 0.3,
  maxRange: 3,
  riskPct: 1,
  dailyLoss: 3,
  maxTrades: 8,
  trendFilter: true,
  reEntry: true,
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
  return out;
}

/** Format a param value for the change log (adds the unit suffix). */
export function formatParamValue(key: keyof StrategyParams, value: number | boolean): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  const suffix = key in PARAM_BOUNDS ? (PARAM_BOUNDS[key as NumericParam].suffix ?? "") : "";
  return `${value}${suffix}`;
}
