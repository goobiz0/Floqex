/**
 * Copy trading shared helpers. Pure, framework-free, and safe to import from
 * both Client and Server Components (no `server-only`, no Prisma). The string
 * unions mirror the Prisma enums so the UI never has to import the Prisma client.
 *
 * `resolveCopyOrder` is the single source of truth for how a master fill turns
 * into a follower order: direction, sizing rule, symbol filter, size bounds, and
 * the real per-trade risk cap. The replication engine, the editor's live preview,
 * and the unit tests all call it, so what a trader sees in the preview is exactly
 * what the engine will place.
 */

export type CopySizingMode = "MIRROR" | "MULTIPLIER" | "PROPORTIONAL" | "FIXED";
export type CopyLinkStatus = "ACTIVE" | "PAUSED";
export type CopyFilterMode = "ALLOW" | "DENY";
export type Direction = "LONG" | "SHORT";

export type SizingModeMeta = {
  value: CopySizingMode;
  label: string;
  description: string;
};

/** Order matters: this drives the picker in the link editor. */
export const SIZING_MODES: SizingModeMeta[] = [
  {
    value: "PROPORTIONAL",
    label: "Proportional",
    description: "Scale each copy by the follower's equity relative to the master, times the multiplier. Keeps risk balanced across accounts of different sizes.",
  },
  {
    value: "MULTIPLIER",
    label: "Multiplier",
    description: "Copy the master's size multiplied by a fixed factor. Use 0.5 to halve, 2 to double.",
  },
  {
    value: "MIRROR",
    label: "Mirror",
    description: "Copy the exact same size as the master order, one for one.",
  },
  {
    value: "FIXED",
    label: "Fixed size",
    description: "Place the same fixed number of units on every copied trade, regardless of the master order.",
  },
];

export const SIZING_MODE_LABEL: Record<CopySizingMode, string> = {
  PROPORTIONAL: "Proportional",
  MULTIPLIER: "Multiplier",
  MIRROR: "Mirror",
  FIXED: "Fixed size",
};

export const STATUS_LABEL: Record<CopyLinkStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
};

/** Reasons a copy can be skipped, surfaced verbatim in the activity log. */
export type CopySkipCode =
  | "SYMBOL_FILTERED"
  | "ZERO_SIZE"
  | "NO_BOT"
  | "ENTRIES_DISABLED"
  | "DAILY_LOSS_LIMIT" | "MIN_SIZE";

/** A short, stable, human-facing id tag for an account (e.g. "#A1B2C3"). */
export function shortAccountId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

/** Flip a direction for reverse-copy links. */
export function flipDirection(direction: Direction): Direction {
  return direction === "LONG" ? "SHORT" : "LONG";
}

/** Round a unit size to 4 dp, clamping away negatives and non-finite junk. */
function round4(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 1e4) / 1e4;
}

/**
 * Derive the follower's order size (absolute units) from the master fill and the
 * link's sizing rule. Pure so the engine and the UI preview agree exactly.
 * Returns a non-negative number rounded to 4 dp; direction is handled separately.
 */
export function computeFollowerUnits(input: {
  masterUnits: number;
  masterBalance: number;
  followerBalance: number;
  sizingMode: CopySizingMode;
  multiplier: number;
  fixedUnits: number | null;
}): number {
  const { masterUnits, masterBalance, followerBalance, sizingMode, multiplier, fixedUnits } = input;
  const mult = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;

  let units: number;
  switch (sizingMode) {
    case "MIRROR":
      units = masterUnits;
      break;
    case "MULTIPLIER":
      units = masterUnits * mult;
      break;
    case "PROPORTIONAL":
      units = masterBalance > 0 ? masterUnits * (followerBalance / masterBalance) * mult : 0;
      break;
    case "FIXED":
      units = fixedUnits ?? 0;
      break;
    default:
      units = 0;
  }

  return round4(units);
}

/** Split a raw symbol filter ("BTC, ETH eth") into normalized, de-duped tokens. */
export function parseSymbolFilter(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const tok of raw.split(/[\s,;]+/)) {
    const t = tok.trim().toUpperCase();
    if (t) seen.add(t);
  }
  return [...seen];
}

/** True when any filter token names this instrument (whole symbol or a leg). */
function instrumentMatchesTokens(instrument: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const upper = instrument.toUpperCase();
  if (tokens.includes(upper)) return true;
  // Match a leg of a pair: "BTC/USD" -> ["BTC","USD"], "EUR-USD", "AAPL".
  const legs = upper.split(/[^A-Z0-9]+/).filter(Boolean);
  return legs.some((leg) => tokens.includes(leg));
}

/**
 * Apply the link's symbol filter. ALLOW mode copies only matching instruments;
 * DENY mode copies everything except matches. An empty filter copies everything.
 */
export function symbolAllowed(
  instrument: string,
  symbolFilter: string | null | undefined,
  mode: CopyFilterMode,
): boolean {
  const tokens = parseSymbolFilter(symbolFilter);
  if (tokens.length === 0) return true;
  const matched = instrumentMatchesTokens(instrument, tokens);
  return mode === "DENY" ? !matched : matched;
}

/**
 * Cap a unit size so the follower never risks more than `maxRiskPct` percent of
 * its own equity on the trade. Risk to the stop = units * stopDistance, so the
 * ceiling is (maxRiskPct/100 * balance) / stopDistance. Returns the input
 * unchanged when a cap cannot be computed (no stop distance or no balance).
 */
export function riskCappedUnits(
  units: number,
  followerBalance: number,
  stopDistance: number,
  maxRiskPct: number | null,
): number {
  if (maxRiskPct === null || !Number.isFinite(maxRiskPct) || maxRiskPct <= 0) return units;
  if (!(followerBalance > 0) || !(stopDistance > 0)) return units;
  const ceiling = ((maxRiskPct / 100) * followerBalance) / stopDistance;
  return Math.min(units, ceiling);
}

/** The full set of per-link rules that decide a single copy. */
export type CopyRule = {
  sizingMode: CopySizingMode;
  multiplier: number;
  fixedUnits: number | null;
  maxRiskPct: number | null; // percent of follower equity, e.g. 2 = 2%
  minUnits: number | null;
  maxUnits: number | null;
  reverse: boolean;
  symbolFilter: string | null;
  symbolFilterMode: CopyFilterMode;
};

export type ResolvedCopyOrder = {
  direction: Direction;
  /** Protective levels for the follower, already swapped for reverse links. */
  stopPrice: number;
  targetPrice: number;
  /** Final order size after sizing, risk cap, and min/max bounds. */
  units: number;
  /** Follower's actual fraction of equity at risk to the stop (e.g. 0.012). */
  riskPct: number;
  /** When set, the copy is not placed; `reason` is logged verbatim. */
  skip: { code: CopySkipCode; reason: string } | null;
};

export type ResolveCopyInput = {
  direction: Direction;
  masterUnits: number;
  masterBalance: number;
  followerBalance: number;
  instrument: string;
  entryPrice: number;
  /** Master's protective levels; swapped for the follower on reverse links. */
  stopPrice: number;
  targetPrice: number;
  /** Master's risk fraction, used as a fallback when a stop distance is absent. */
  masterRiskPct: number;
  rule: CopyRule;
};

/**
 * Turn a master fill into a concrete follower order (or an explained skip).
 * This is the one place the sizing rules live, shared by the engine and the UI.
 */
export function resolveCopyOrder(input: ResolveCopyInput): ResolvedCopyOrder {
  const { rule } = input;
  const direction = rule.reverse ? flipDirection(input.direction) : input.direction;

  // Reverse copies invert the trade, so protective levels swap roles: the
  // master's target becomes the follower's stop and vice versa.
  const stopPrice = rule.reverse ? input.targetPrice : input.stopPrice;
  const targetPrice = rule.reverse ? input.stopPrice : input.targetPrice;
  const stopDistance = Math.abs(input.entryPrice - stopPrice);

  const base: Omit<ResolvedCopyOrder, "skip" | "units" | "riskPct"> = {
    direction,
    stopPrice,
    targetPrice,
  };

  // 1. Symbol filter — cheapest gate first.
  if (!symbolAllowed(input.instrument, rule.symbolFilter, rule.symbolFilterMode)) {
    return {
      ...base,
      units: 0,
      riskPct: 0,
      skip: {
        code: "SYMBOL_FILTERED",
        reason:
          rule.symbolFilterMode === "DENY"
            ? `${input.instrument} is on this link's block list.`
            : `${input.instrument} is not on this link's allow list.`,
      },
    };
  }

  // 2. Base size from the sizing rule.
  let units = computeFollowerUnits({
    masterUnits: Math.abs(input.masterUnits),
    masterBalance: input.masterBalance,
    followerBalance: input.followerBalance,
    sizingMode: rule.sizingMode,
    multiplier: rule.multiplier,
    fixedUnits: rule.fixedUnits,
  });

  // 3. Floor first, then ceilings (risk cap + max) so a hard limit always wins.
  if (units > 0 && rule.minUnits !== null && rule.minUnits > 0 && units < rule.minUnits) {
    units = rule.minUnits;
  }
  units = riskCappedUnits(units, input.followerBalance, stopDistance, rule.maxRiskPct);
  if (rule.maxUnits !== null && rule.maxUnits > 0) {
    units = Math.min(units, rule.maxUnits);
  }
  units = round4(units);

  if (rule.minUnits !== null && rule.minUnits > 0 && units > 0 && units < rule.minUnits) {
    const reason = `Risk or maximum caps reduced the copy size to ${units}, which is below your strict minimum of ${rule.minUnits}. Order skipped.`;
    return { ...base, units: 0, riskPct: 0, skip: { code: "MIN_SIZE", reason } };
  }

  if (units <= 0) {
    const reason =
      rule.sizingMode === "PROPORTIONAL" && !(input.masterBalance > 0)
        ? "Proportional sizing needs a master balance above zero."
        : "The sizing rule resolved to a zero-unit order. Raise the multiplier, set a minimum size, or use a fixed size.";
    return { ...base, units: 0, riskPct: 0, skip: { code: "ZERO_SIZE", reason } };
  }

  // 4. Real follower risk: fraction of equity at risk to the (swapped) stop.
  const riskPct =
    stopDistance > 0 && input.followerBalance > 0
      ? (units * stopDistance) / input.followerBalance
      : Number.isFinite(input.masterRiskPct) && input.masterRiskPct > 0
        ? input.masterRiskPct
        : 0;

  return { ...base, units, riskPct, skip: null };
}
