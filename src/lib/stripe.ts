import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazily-constructed Stripe client (server-only). Deferred so the build never
 * needs STRIPE_SECRET_KEY; it is required only when a billing route runs.
 */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}
