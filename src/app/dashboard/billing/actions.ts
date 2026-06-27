"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { PLANS, planFromPriceId, isPaidPriceId, type Plan } from "@/lib/plans";
import { dashboardUrl } from "@/lib/urls";

type Result = { ok: boolean; url?: string; error?: string };

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const absolute = (url: string, base: string) => (url.startsWith("http") ? url : `${base}${url}`);

/**
 * True when a Stripe error means the configured price id does not exist in this
 * account (env drift, a deleted price, or a placeholder default). When this
 * happens we rebuild the checkout from an inline price so the plan still works.
 */
function isMissingPriceError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; raw?: { code?: string; message?: string } };
  const code = e?.code ?? e?.raw?.code;
  const msg = (e?.message ?? e?.raw?.message ?? "").toLowerCase();
  return code === "resource_missing" || msg.includes("no such price") || msg.includes("no such plan");
}

/** Find (or lazily create) the Stripe customer for the signed-in user. */
async function ensureCustomer(): Promise<{ id: string; customerId: string } | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return null;
  if (user.stripeCustomerId) return { id: user.id, customerId: user.stripeCustomerId };

  const customer = await getStripe().customers.create(
    {
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      metadata: { clerkId, userId: user.id },
    },
    // Idempotency keyed on the user so two concurrent requests can't create
    // duplicate Stripe customers (one update would orphan the other).
    { idempotencyKey: `create-customer-${user.id}` },
  );
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return { id: user.id, customerId: customer.id };
}

/** Start a Stripe Checkout session for a paid plan; returns the redirect URL. */
export async function startCheckout(plan: Plan, returnUrls?: { success: string; cancel: string }): Promise<Result> {
  // Server actions receive arbitrary client input; guard before indexing PLANS.
  const cfg = PLANS[plan];
  if (!cfg) return { ok: false, error: "Invalid plan." };
  if (cfg.price <= 0) return { ok: false, error: "That plan does not require checkout." };

  const origin = await requestOrigin();
  const billing = absolute(dashboardUrl("/billing"), origin);
  const successUrl = absolute(returnUrls ? returnUrls.success : `${billing}?status=success`, origin);
  const cancelUrl = absolute(returnUrls ? returnUrls.cancel : `${billing}?status=cancelled`, origin);

  try {
    const customer = await ensureCustomer();
    if (!customer) return { ok: false, error: "You are not signed in." };

    // Shared session config. The plan is stamped on both the session and the
    // subscription metadata so the webhook (and reconcile) always resolve the
    // right tier even when checkout falls back to an inline price below.
    const base = {
      mode: "subscription" as const,
      customer: customer.customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      client_reference_id: customer.id,
      metadata: { userId: customer.id, plan },
      subscription_data: { metadata: { userId: customer.id, plan } },
    };

    // Inline price built from the plan catalogue. This is the fallback that
    // keeps a tier working when its Stripe price id is missing or misconfigured
    // (the bug that broke the Elite plan: its price env var was never set, so it
    // fell back to a placeholder id that does not exist in Stripe).
    const inlineLineItem = {
      quantity: 1,
      price_data: {
        currency: "usd",
        product_data: { name: `Floqex ${cfg.name}` },
        unit_amount: Math.round(cfg.price * 100),
        recurring: { interval: "month" as const },
      },
    };

    const create = (lineItems: typeof inlineLineItem[] | { price: string; quantity: number }[]) =>
      getStripe().checkout.sessions.create({ ...base, line_items: lineItems });

    let session;
    if (cfg.priceId) {
      try {
        session = await create([{ price: cfg.priceId, quantity: 1 }]);
      } catch (err) {
        if (!isMissingPriceError(err)) throw err;
        console.warn(`[startCheckout] price ${cfg.priceId} missing for ${plan}; using inline price`);
        session = await create([inlineLineItem]);
      }
    } else {
      session = await create([inlineLineItem]);
    }

    return session.url ? { ok: true, url: session.url } : { ok: false, error: "Could not start checkout." };
  } catch (err) {
    console.error("[startCheckout] Stripe error:", err);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}

/** Open the Stripe Billing Portal so the user can manage/cancel their plan. */
export async function openBillingPortal(): Promise<Result> {
  const billing = absolute(dashboardUrl("/billing"), await requestOrigin());
  try {
    const customer = await ensureCustomer();
    if (!customer) return { ok: false, error: "You are not signed in." };

    const session = await getStripe().billingPortal.sessions.create({
      customer: customer.customerId,
      return_url: billing,
    });
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("[openBillingPortal] Stripe error:", err);
    return { ok: false, error: "Could not open the billing portal." };
  }
}

/** Resolve the plan a subscription grants from its line items + metadata. */
function planForSubscription(sub: Stripe.Subscription): Plan {
  const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  if (!active) return "FREE";
  const priceId =
    sub.items.data.map((i) => i.price?.id).find((id) => isPaidPriceId(id)) ??
    sub.items.data[0]?.price?.id;
  return (sub.metadata?.plan as Plan) || planFromPriceId(priceId);
}

/**
 * Pull the customer's current subscription straight from Stripe and mirror it
 * onto the user row. Called when the user returns from Checkout so the plan
 * flips immediately, instead of waiting on (or depending on) the webhook, which
 * can be delayed or unconfigured. Safe to call repeatedly; it is idempotent.
 */
export async function reconcileSubscription(): Promise<{ ok: boolean; plan?: Plan; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "You are not signed in." };

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !user.stripeCustomerId) return { ok: false, error: "No billing customer yet." };

  try {
    const subs = await getStripe().subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 10,
    });

    // Prefer a live subscription; fall back to the most recent one so a cancel
    // correctly drops the user back to FREE.
    const live = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));
    const sub = live ?? subs.data.sort((a, b) => b.created - a.created)[0];

    if (!sub) {
      if (user.plan !== "FREE") {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: "FREE", stripeSubscriptionId: null, stripeSubStatus: null, stripeCurrentPeriodEnd: null },
        });
      }
      revalidatePath("/dashboard/billing");
      return { ok: true, plan: "FREE" };
    }

    const plan = planForSubscription(sub);
    const periodEnd =
      (sub.items.data[0] as { current_period_end?: number } | undefined)?.current_period_end ??
      (sub as unknown as { current_period_end?: number }).current_period_end;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        stripeSubscriptionId: sub.id,
        stripeSubStatus: sub.status,
        stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });

    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");
    return { ok: true, plan };
  } catch (err) {
    console.error("[reconcileSubscription] Stripe error:", err);
    return { ok: false, error: "Could not refresh your subscription." };
  }
}
