/**
 * Plan catalogue — the entitlement tiers and their Stripe price IDs. `plan` on
 * the User mirrors the active Stripe subscription (kept in sync by the webhook),
 * and the app gates features/limits off it. Price IDs come from env so test and
 * live modes can differ; the defaults are the current Stripe (test) prices.
 */

export type Plan = "FREE" | "TRADER" | "PRO";

export const PRICE_IDS = {
  TRADER: process.env.NEXT_PUBLIC_STRIPE_PRICE_TRADER ?? "price_1TkeghDfBPHnomO3YsRzXVo7",
  PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "price_1TkegrDfBPHnomO3qsVfTw0i",
} as const;

export type PlanConfig = {
  id: Plan;
  name: string;
  price: number; // USD / month
  priceId: string | null;
  accountLimit: number; // Number.POSITIVE_INFINITY = unlimited
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
    price: 29,
    priceId: PRICE_IDS.TRADER,
    accountLimit: 3,
    liveTrading: true,
    copyTrading: false,
    popular: true,
    tagline: "Go live across multiple accounts.",
    features: [
      "Everything in Free",
      "Live trading",
      "3 accounts / bots",
      "Discord alerts",
      "Priority support",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 79,
    priceId: PRICE_IDS.PRO,
    accountLimit: Number.POSITIVE_INFINITY,
    liveTrading: true,
    copyTrading: true,
    tagline: "Scale with unlimited bots and tooling.",
    features: [
      "Everything in Trader",
      "Unlimited accounts / bots",
      "Copy trading",
      "Strategy marketplace",
      "Backtesting & API access",
    ],
  },
};

export const PLAN_ORDER: Plan[] = ["FREE", "TRADER", "PRO"];

/** Map a Stripe price id back to the plan it grants. */
export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (priceId === PRICE_IDS.PRO) return "PRO";
  if (priceId === PRICE_IDS.TRADER) return "TRADER";
  return "FREE";
}

export function formatAccountLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}
