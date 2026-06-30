// Curated, ready-to-run strategy templates surfaced in the "New strategy" flow.
// A template is a pure description plus a `buildParams()` that returns a params
// object the server action validates (ORB bounds + custom-signal contract)
// before persisting. Keeping these pure means they are safe to import anywhere
// and easy to unit test. Icons are referenced by key and mapped in the UI so
// this module stays free of React.

import { DEFAULT_PARAMS } from "./strategy-schema";
import type { ConditionGroup } from "./custom-strategy";

export type TemplateIconKey =
  | "breakout"
  | "shield"
  | "lightning"
  | "trend"
  | "pulse"
  | "reversion";

export type StrategyTemplate = {
  id: string;
  name: string;
  /** One-line hook shown under the title. */
  tagline: string;
  /** Two-sentence plain-English explanation of the edge. */
  description: string;
  /** Short category chip, e.g. "Breakout". */
  category: string;
  iconKey: TemplateIconKey;
  kind: "ORB" | "CUSTOM";
  /** Whether this template leans on premium indicators/parameters. */
  premium?: boolean;
  /** Build the params payload sent to the create action. */
  buildParams: () => Record<string, unknown>;
};

const DEFAULT_INSTRUMENTS = ["NQ"];

/** Shared scaffold for a no-code custom-signal template. */
function builderParams(opts: {
  direction: "LONG" | "SHORT" | "BOTH";
  groups: ConditionGroup[];
  stopLossPct?: number;
  targetRatio?: number;
  overrides?: Partial<typeof DEFAULT_PARAMS>;
}): Record<string, unknown> {
  return {
    ...DEFAULT_PARAMS,
    ...opts.overrides,
    instruments: DEFAULT_INSTRUMENTS,
    instrument: DEFAULT_INSTRUMENTS[0],
    mode: "BUILDER",
    direction: opts.direction,
    groups: opts.groups,
    stopLossPct: opts.stopLossPct ?? 0.5,
    targetRatio: opts.targetRatio ?? 2,
  };
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: "orb-classic",
    name: "Opening Range Breakout",
    tagline: "Ride the first decisive move of the session.",
    description:
      "Captures momentum as price breaks the high or low of the opening range. A proven, rules-based starting point that is easy to reason about.",
    category: "Breakout",
    iconKey: "breakout",
    kind: "ORB",
    buildParams: () => ({ 
      ...DEFAULT_PARAMS,
      rrTarget: 2.5,
      minRange: 0.5,
      stopLossPct: 0.5,
      trendFilter: true,
      maxTrades: 4
    }),
  },
  {
    id: "orb-conservative",
    name: "Conservative Breakout",
    tagline: "Lower risk, trend-aligned, fewer trades.",
    description:
      "The opening range breakout with the brakes on: half the per-trade risk, a tight daily cap, and the trend filter on so it only trades with the bigger move.",
    category: "Breakout",
    iconKey: "shield",
    kind: "ORB",
    buildParams: () => ({
      ...DEFAULT_PARAMS,
      riskPct: 0.5,
      rrTarget: 2,
      stopLossPct: 0.4,
      dailyLoss: 2,
      maxTrades: 3,
      trailingStopPct: 0.4,
      trendFilter: true,
      newsPause: true,
      minRange: 0.6,
    }),
  },
  {
    id: "orb-aggressive",
    name: "Aggressive Breakout",
    tagline: "Press momentum with a wider reward target.",
    description:
      "Leans into strong sessions with a higher reward-to-risk target and more trades allowed per day. Built for volatile names and experienced operators.",
    category: "Breakout",
    iconKey: "lightning",
    kind: "ORB",
    premium: true,
    buildParams: () => ({
      ...DEFAULT_PARAMS,
      riskPct: 1.5,
      rrTarget: 3.5,
      stopLossPct: 0.6,
      maxTrades: 6,
      minRange: 0.4,
      trailingStopPct: 1,
      reEntry: true,
      trendFilter: false,
    }),
  },
  {
    id: "trend-pullback",
    name: "Trend Pullback",
    tagline: "Buy dips while the trend is still up.",
    description:
      "Enters long when price holds above the 50-period average but RSI has dipped below 40. A classic buy-the-dip filter that avoids chasing extended moves.",
    category: "Trend",
    iconKey: "trend",
    kind: "CUSTOM",
    buildParams: () =>
      builderParams({
        direction: "BOTH", // Changed to BOTH to improve resilience across market regimes
        targetRatio: 2.5,
        stopLossPct: 0.5,
        overrides: {
          minRange: 0.5,
        },
        groups: [
          {
            join: "ALL",
            conditions: [
              { left: "price", op: ">", right: { kind: "indicator", key: "sma50" } },
              { left: "rsi14", op: "<", right: { kind: "value", value: 40 } },
            ],
          },
        ],
      }),
  },
  {
    id: "momentum-breakout",
    name: "Momentum Breakout",
    tagline: "Enter strength at the top of the range.",
    description:
      "Goes long when price sits in the top 10 percent of the day's range with positive MACD momentum. Designed to catch trending continuation, not reversals.",
    category: "Momentum",
    iconKey: "pulse",
    kind: "CUSTOM",
    premium: true,
    buildParams: () =>
      builderParams({
        direction: "BOTH",
        targetRatio: 3,
        stopLossPct: 0.5,
        overrides: {
          minRange: 0.5,
          trendFilter: true,
        },
        groups: [
          {
            join: "ALL",
            conditions: [
              { left: "rangePosition", op: ">", right: { kind: "value", value: 90 } },
              { left: "macd", op: ">", right: { kind: "value", value: 0 } },
            ],
          },
        ],
      }),
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    tagline: "Fade extremes inside a longer uptrend.",
    description:
      "Buys deeply oversold conditions, RSI below 25, but only while price stays above the 200-period average so you are fading dips, not catching a falling knife.",
    category: "Reversion",
    iconKey: "reversion",
    kind: "CUSTOM",
    premium: true,
    buildParams: () =>
      builderParams({
        direction: "BOTH",
        targetRatio: 2,
        stopLossPct: 0.75,
        overrides: {
          minRange: 0.6,
        },
        groups: [
          {
            join: "ALL",
            conditions: [
              { left: "rsi14", op: "<", right: { kind: "value", value: 25 } },
              { left: "price", op: ">", right: { kind: "indicator", key: "sma200" } },
            ],
          },
        ],
      }),
  },
];

export function templateById(id: string): StrategyTemplate | undefined {
  return STRATEGY_TEMPLATES.find((t) => t.id === id);
}
