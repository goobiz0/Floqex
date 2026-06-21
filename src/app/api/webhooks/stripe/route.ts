import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { planFromPriceId, isPaidPriceId, type Plan } from "@/lib/plans";

export const runtime = "nodejs";

/** Mirror the Stripe subscription state onto the matching user row. */
async function syncSubscription(customerId: string, sub: Stripe.Subscription) {
  // A subscription can hold multiple items (e.g. add-ons); pick the one whose
  // price maps to a known paid tier rather than assuming it is the first item.
  // isPaidPriceId is side-effect free, so scanning never logs spurious warnings.
  const priceId =
    sub.items.data.map((i) => i.price?.id).find((id) => isPaidPriceId(id)) ??
    sub.items.data[0]?.price?.id;
  const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  const plan: Plan = active ? planFromPriceId(priceId) : "FREE";

  // current_period_end lives on the subscription (older API) or its items (newer).
  const periodEnd =
    (sub.items.data[0] as { current_period_end?: number } | undefined)?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan,
      stripeSubscriptionId: sub.id,
      stripeSubStatus: sub.status,
      stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) {
    return new NextResponse("Missing webhook secret or signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Link the newly created customer ID to our internal user via metadata
        if (session.metadata?.userId && session.customer) {
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: { stripeCustomerId: session.customer as string },
          });
        }

        if (session.subscription && session.customer) {
          const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
          await syncSubscription(session.customer as string, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub.customer as string, sub);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook handler error", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
