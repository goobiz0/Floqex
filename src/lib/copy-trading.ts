/**
 * Copy trading shared helpers. Pure, framework-free, and safe to import from
 * both Client and Server Components (no `server-only`, no Prisma). The string
 * unions mirror the Prisma enums so the UI never has to import the Prisma client.
 */

export type CopySizingMode = "MIRROR" | "MULTIPLIER" | "PROPORTIONAL" | "FIXED";
export type CopyLinkStatus = "ACTIVE" | "PAUSED";

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

/** A short, stable, human-facing id tag for an account (e.g. "#A1B2C3"). */
export function shortAccountId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
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

  if (!Number.isFinite(units) || units < 0) return 0;
  return Math.round(units * 1e4) / 1e4;
}

/** Flip a direction for reverse-copy links. */
export function flipDirection(direction: "LONG" | "SHORT"): "LONG" | "SHORT" {
  return direction === "LONG" ? "SHORT" : "LONG";
}
