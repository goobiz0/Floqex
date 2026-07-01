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
      // Calibrated: a 0.75% stop survives normal session noise, RR 1.8 is
      // reachable on most trending days, and a trailing stop locks in the move.
      rrTarget: 1.8,
      minRange: DEFAULT_PARAMS.minRange,
      stopLossPct: 0.75,
      trailingStopPct: 0.5,
      trendFilter: true,
      maxTrades: 4,
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
      // Half the per-trade risk, but a stop wide enough (0.6%) to not get
      // scratched, and RR 1.8 so it clears costs comfortably.
      riskPct: 0.5,
      rrTarget: 1.8,
      stopLossPct: 0.6,
      dailyLoss: 2,
      maxTrades: 3,
      trailingStopPct: 0.4,
      trendFilter: true,
      newsPause: true,
      minRange: 0.5,
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
      // RR 3.5 was unreachable on most sessions; 2.5 with a 1.0% stop is wide
      // enough for volatile names and the 0.8% trail rides the runners.
      riskPct: 1.5,
      rrTarget: 2.5,
      stopLossPct: 1.0,
      maxTrades: 6,
      minRange: 0.4,
      trailingStopPct: 0.8,
      reEntry: true,
      trendFilter: false,
    }),
  },
  {
    id: "trend-pullback",
    name: "Trend Pullback",
    tagline: "Buy dips while the trend is still up.",
    description:
      "Enters long when price holds above both the 20- and 50-period averages but RSI has dipped below 35. A classic buy-the-dip filter that only fires while the near-term trend is still intact.",
    category: "Trend",
    iconKey: "trend",
    kind: "CUSTOM",
    buildParams: () =>
      builderParams({
        direction: "LONG",
        targetRatio: 2,
        stopLossPct: 0.75,
        overrides: {
          minRange: 0.4,
          rrTarget: 2,
        },
        groups: [
          {
            join: "ALL",
            conditions: [
              // Medium-trend gate, plus a short-trend (SMA20) cross-confirmation
              // so we only buy dips while the near-term structure is still up.
              { left: "price", op: ">", right: { kind: "indicator", key: "sma50" } },
              { left: "price", op: ">", right: { kind: "indicator", key: "sma20" } },
              { left: "rsi14", op: "<", right: { kind: "value", value: 35 } },
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
      "Goes long when price sits in the top 20 percent of the day's range with positive MACD momentum and confirming volume. Designed to catch trending continuation, not reversals.",
    category: "Momentum",
    iconKey: "pulse",
    kind: "CUSTOM",
    premium: true,
    buildParams: () =>
      builderParams({
        direction: "LONG",
        // RR 2.5 is more reachable on a continuation than 3.0; the wider 0.6%
        // stop keeps us in the move through the first pullback.
        targetRatio: 2.5,
        stopLossPct: 0.6,
        overrides: {
          minRange: 0.4,
          trendFilter: true,
          rrTarget: 2.5,
        },
        groups: [
          {
            join: "ALL",
            conditions: [
              // Top 20% of the range (was top 10%, which fired too rarely),
              // positive MACD momentum, and live volume to confirm participation.
              { left: "rangePosition", op: ">", right: { kind: "value", value: 80 } },
              { left: "macd", op: ">", right: { kind: "value", value: 0 } },
              { left: "volume", op: ">", right: { kind: "value", value: 0 } },
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
      "Buys oversold conditions, RSI below 30, but only while price stays above the 200-period average so you are fading dips, not catching a falling knife. The stop scales with ATR to give the reversion room.",
    category: "Reversion",
    iconKey: "reversion",
    kind: "CUSTOM",
    premium: true,
    buildParams: () =>
      builderParams({
        direction: "LONG",
        targetRatio: 2,
        // Reversions need room: a 1.0% stop with ATR scaling lets the position
        // breathe instead of getting knifed on the first lower tick.
        stopLossPct: 1.0,
        overrides: {
          minRange: 0.5,
          rrTarget: 2,
          atrStopMultiple: 2,
        },
        groups: [
          {
            join: "ALL",
            conditions: [
              // RSI < 25 fired extremely rarely; 30 is still a real oversold read
              // while keeping the long-trend (SMA200) filter intact.
              { left: "rsi14", op: "<", right: { kind: "value", value: 30 } },
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
