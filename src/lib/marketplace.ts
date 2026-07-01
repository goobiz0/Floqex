import { type Plan } from "./plans";

// The platform takes a 30% cut of all sales, which covers the ~3% Stripe fee,
// infrastructure, and platform profit. The seller keeps exactly 70%.
export const MARKETPLACE_PLATFORM_FEE_PCT = 0.30;
export const MARKETPLACE_SELLER_CUT_PCT = 1.0 - MARKETPLACE_PLATFORM_FEE_PCT;

// Minimum balance required before a seller can request a withdrawal.
export const MIN_WITHDRAWAL_AMOUNT_USD = 50.0;

export const LISTING_CATEGORIES = [
  "Breakout",
  "Reversion",
  "Momentum",
  "Trend",
  "Volatility",
  "Scalp",
] as const;

export type ListingCategory = typeof LISTING_CATEGORIES[number];

/** Can this user list strategies for sale? */
export function canListStrategies(plan: Plan): boolean {
  return plan === "PRO" || plan === "ELITE";
}

/** Compute the platform fee and seller earnings for a given listing price. */
export function computeMarketplaceSplits(priceUsd: number) {
  const totalCents = Math.round(priceUsd * 100);
  const platformFeeCents = Math.round(totalCents * MARKETPLACE_PLATFORM_FEE_PCT);
  const sellerEarningCents = totalCents - platformFeeCents;

  return {
    platformFeeUsd: platformFeeCents / 100,
    sellerEarningUsd: sellerEarningCents / 100,
  };
}
