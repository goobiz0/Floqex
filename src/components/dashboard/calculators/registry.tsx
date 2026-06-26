import type { ComponentType } from "react";
import {
  Barbell,
  ChartLineUp,
  ChartPieSlice,
  DiceFive,
  Equals,
  Lifebuoy,
  Percent,
  Receipt,
  Scales,
  Target,
  TrendUp,
  WaveSine,
  type Icon,
} from "@phosphor-icons/react";
import {
  AtrStopTargetCalc,
  PositionSizeCalc,
  RiskRewardCalc,
} from "./position-risk";
import { BreakevenCalc, LeverageCalc, ProfitLossCalc } from "./leverage-pnl";
import { ExpectancyCalc, KellyCalc, RequiredWinRateCalc } from "./strategy-edge";
import { CompoundingCalc, DrawdownRecoveryCalc, MonteCarloCalc } from "./simulation";

/** Props every calculator receives. `defaultBalance` is the user's real active
 * account equity when signed in, falling back to a sensible demo figure. */
export type CalcProps = { defaultBalance: number };

export type CalcCategoryId = "position-risk" | "leverage-pnl" | "strategy-edge" | "simulation";

export type CalcCategory = {
  id: CalcCategoryId;
  label: string;
  blurb: string;
  icon: Icon;
};

export type CalcMeta = {
  id: string;
  name: string;
  /** One-liner shown on the directory card. */
  blurb: string;
  /** Fuller sentence shown at the top of the open calculator. */
  description: string;
  category: CalcCategoryId;
  icon: Icon;
  component: ComponentType<CalcProps>;
  keywords?: string;
};

export const CATEGORIES: CalcCategory[] = [
  {
    id: "position-risk",
    label: "Position & Risk",
    blurb: "Size every trade to a fixed risk and place stops with intent.",
    icon: Scales,
  },
  {
    id: "leverage-pnl",
    label: "Leverage & P&L",
    blurb: "Margin, liquidation and the real, fee-aware result of a trade.",
    icon: Barbell,
  },
  {
    id: "strategy-edge",
    label: "Strategy & Edge",
    blurb: "Quantify your edge and the bet size it can support.",
    icon: ChartPieSlice,
  },
  {
    id: "simulation",
    label: "Simulation & Projection",
    blurb: "Stress-test an edge across thousands of possible futures.",
    icon: DiceFive,
  },
];

export const CALCULATORS: CalcMeta[] = [
  // Position & Risk
  {
    id: "position-size",
    name: "Position Size",
    blurb: "Turn a risk percentage and a stop into an exact position size.",
    description:
      "Sizes a position so a full stop-out costs exactly the percentage of your account you choose. The single most important risk control there is.",
    category: "position-risk",
    icon: Scales,
    component: PositionSizeCalc,
    keywords: "units lot sizing risk notional leverage",
  },
  {
    id: "risk-reward",
    name: "Risk / Reward",
    blurb: "Reward-to-risk and the win rate a setup needs to pay.",
    description:
      "Measures the reward-to-risk of a planned trade from your entry, stop and target, and the break-even win rate that ratio implies.",
    category: "position-risk",
    icon: Target,
    component: RiskRewardCalc,
    keywords: "rr ratio breakeven win rate payoff target stop",
  },
  {
    id: "atr-stop-target",
    name: "ATR Stop & Target",
    blurb: "Volatility-scaled stops and targets from ATR.",
    description:
      "Places your stop and target a chosen number of ATRs from entry, so exits adapt to how much the instrument actually moves.",
    category: "position-risk",
    icon: WaveSine,
    component: AtrStopTargetCalc,
    keywords: "atr volatility stop target range",
  },
  // Leverage & P&L
  {
    id: "leverage-margin",
    name: "Leverage & Margin",
    blurb: "Margin required and the price that liquidates you.",
    description:
      "Works out the margin a leveraged position locks up and the approximate price at which it gets liquidated, so you can keep a buffer.",
    category: "leverage-pnl",
    icon: Barbell,
    component: LeverageCalc,
    keywords: "leverage margin liquidation notional futures",
  },
  {
    id: "profit-loss",
    name: "Profit & Loss",
    blurb: "Net P&L, return and R multiple, fees included.",
    description:
      "Computes the realised profit or loss of a closed position net of fees, plus the return on notional and the result in R multiples.",
    category: "leverage-pnl",
    icon: Receipt,
    component: ProfitLossCalc,
    keywords: "pnl profit loss return fees roi r multiple",
  },
  {
    id: "breakeven",
    name: "Break-even",
    blurb: "The move needed just to cover your costs.",
    description:
      "Adds up commission, spread and slippage to find the exact price a position must reach before it is genuinely in profit.",
    category: "leverage-pnl",
    icon: Equals,
    component: BreakevenCalc,
    keywords: "breakeven fees spread slippage cost",
  },
  // Strategy & Edge
  {
    id: "kelly",
    name: "Kelly Criterion",
    blurb: "Growth-optimal bet size for your edge.",
    description:
      "Finds the stake that maximises long-run growth for a given win rate and payoff, with half and quarter Kelly for a calmer ride.",
    category: "strategy-edge",
    icon: ChartPieSlice,
    component: KellyCalc,
    keywords: "kelly optimal fraction bet sizing growth",
  },
  {
    id: "expectancy",
    name: "Expectancy",
    blurb: "Expected value per trade from your stats.",
    description:
      "Translates your win rate and average win and loss into expected value per trade, profit factor and edge per dollar risked.",
    category: "strategy-edge",
    icon: ChartLineUp,
    component: ExpectancyCalc,
    keywords: "expectancy edge profit factor expected value",
  },
  {
    id: "required-win-rate",
    name: "Required Win Rate",
    blurb: "The hit rate a payoff needs to break even.",
    description:
      "Shows the break-even win rate for any reward-to-risk, and how quickly bigger winners reduce the hit rate you need.",
    category: "strategy-edge",
    icon: Percent,
    component: RequiredWinRateCalc,
    keywords: "win rate breakeven payoff hit rate",
  },
  // Simulation & Projection
  {
    id: "monte-carlo",
    name: "Monte Carlo Simulation",
    blurb: "Thousands of equity paths from one edge.",
    description:
      "Simulates thousands of trade sequences from your win rate, payoff and risk to map the range of outcomes, probability of profit and risk of ruin.",
    category: "simulation",
    icon: DiceFive,
    component: MonteCarloCalc,
    keywords: "monte carlo simulation distribution risk of ruin drawdown probability",
  },
  {
    id: "compounding",
    name: "Compounding Projection",
    blurb: "Project equity growth period by period.",
    description:
      "Projects how an account compounds at a steady return, with optional recurring contributions, period by period.",
    category: "simulation",
    icon: TrendUp,
    component: CompoundingCalc,
    keywords: "compound growth projection contributions interest",
  },
  {
    id: "drawdown-recovery",
    name: "Drawdown Recovery",
    blurb: "The gain needed to climb out of a drawdown.",
    description:
      "Reveals the asymmetric gain required to recover from a drawdown, and why deep drawdowns are so much harder to undo.",
    category: "simulation",
    icon: Lifebuoy,
    component: DrawdownRecoveryCalc,
    keywords: "drawdown recovery loss recovery breakeven",
  },
];

export function getCalculator(id: string | null | undefined): CalcMeta | undefined {
  if (!id) return undefined;
  return CALCULATORS.find((c) => c.id === id);
}

export function getCategory(id: CalcCategoryId): CalcCategory {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}
