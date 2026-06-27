/**
 * Plan catalogue — the entitlement tiers and their Stripe price IDs. `plan` on
 * the User mirrors the active Stripe subscription (kept in sync by the webhook),
 * and the app gates features/limits off it. Price IDs come from env so test and
 * live modes can differ; the defaults are the current Stripe (test) prices.
 */

export type Plan = "FREE" | "TRADER" | "PRO" | "ELITE";

export const PRICE_IDS = {
  TRADER: process.env.NEXT_PUBLIC_STRIPE_PRICE_TRADER ?? "price_1Tl6eJDfBPHnomO37xRo5dKY",
  PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "price_1Tl6eSDfBPHnomO3uM9K9M2j",
  ELITE: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE ?? "price_1Tl6eYDfBPHnomO3jL1vT4kP",
} as const;

export type PlanConfig = {
  id: Plan;
  name: string;
  price: number; // USD / month
  priceId: string | null;
  accountLimit: number; // Number.POSITIVE_INFINITY = unlimited
  strategyLimit: number;
  liveTrading: boolean;
  copyTrading: boolean;
  popular?: boolean;
  tagline: string;
  features: string[];
};

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Free",
    price: 0,
    priceId: null,
    accountLimit: 1,
    strategyLimit: 2,
    liveTrading: false,
    copyTrading: false,
    tagline: "Paper trade and learn the system.",
    features: [
      "Paper trading",
      "1 account · 1 bot",
      "Full dashboard, journal & analytics",
      "Transparent agent feed",
    ],
  },
  TRADER: {
    id: "TRADER",
    name: "Trader",
    price: 19,
    priceId: PRICE_IDS.TRADER,
    accountLimit: 3,
    strategyLimit: 4,
    liveTrading: true,
    copyTrading: false,
    tagline: "Go live across multiple accounts.",
    features: [
      "Everything in Free",
      "Live trading",
      "Max 3 accounts / bots",
      "Discord alerts",
      "Priority support",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 49,
    priceId: PRICE_IDS.PRO,
    accountLimit: 10,
    strategyLimit: 10,
    liveTrading: true,
    copyTrading: true,
    popular: true,
    tagline: "Scale with advanced bots and tooling.",
    features: [
      "Everything in Trader",
      "Max 10 accounts / bots",
      "Copy trading",
      "Strategy marketplace",
      "Backtesting & API access",
    ],
  },
  ELITE: {
    id: "ELITE",
    name: "Elite",
    price: 99,
    priceId: PRICE_IDS.ELITE,
    accountLimit: 25,
    strategyLimit: 15,
    liveTrading: true,
    copyTrading: true,
    tagline: "Institutional-grade infrastructure.",
    features: [
      "25 Active Bots",
      "Ultra-low latency execution",
      "Unlimited backtests",
      "24/7 dedicated support",
      "Full API access",
    ],
  },
};

export const PLAN_ORDER: Plan[] = ["FREE", "TRADER", "PRO", "ELITE"];

/**
 * Mochi (AI copilot) token budgets per plan, over two rolling windows. The
 * per-5-hour window is a burst guard (protects against a single session running
 * up cost); the weekly window is the overall allowance. Tuned so the unit cost
 * of Gemini Flash stays well within each plan's price.
 */
export const MOCHI_LIMITS: Record<Plan, { per5h: number; perWeek: number }> = {
  FREE: { per5h: 20_000, perWeek: 80_000 },
  TRADER: { per5h: 120_000, perWeek: 1_200_000 },
  PRO: { per5h: 400_000, perWeek: 5_000_000 },
  ELITE: { per5h: 1_200_000, perWeek: 20_000_000 },
};

/** True when the price id maps to a known paid tier. Side-effect free (no logging). */
export function isPaidPriceId(priceId: string | null | undefined): boolean {
  return priceId === PRICE_IDS.TRADER || priceId === PRICE_IDS.PRO || priceId === PRICE_IDS.ELITE;
}

/** Map a Stripe price id back to the plan it grants. */
export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "FREE";
  if (priceId === PRICE_IDS.ELITE) return "ELITE";
  if (priceId === PRICE_IDS.PRO) return "PRO";
  if (priceId === PRICE_IDS.TRADER) return "TRADER";
  // A non-null price we don't recognize means env drift or a new product.
  // Surface it rather than silently downgrading a paying customer to FREE.
  console.error(`Unrecognized Stripe price id: ${priceId}`);
  return "FREE";
}

export function formatAccountLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}
