import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazily-constructed Stripe client (server-only). Deferred so the build never
 * needs STRIPE_SECRET_KEY; it is required only when a billing route runs.
 */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("STRIPE_SECRET_KEY environment variable is required in production");
      }
      console.warn("STRIPE_SECRET_KEY is not set. Stripe will not work.");
    }
    
    client = new Stripe(key || "sk_test_mock", {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return client;
}
