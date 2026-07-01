import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getPostHogClient } from "@/lib/posthog-server";
import type Stripe from "stripe";

import { checkRateLimit } from "@/lib/ratelimit";

const getEndpointSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required in production");
  }
  return secret;
};

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const rateLimitSuccess = await checkRateLimit(`stripe_webhook_${ip}`, 100, "1 m");
  if (!rateLimitSuccess) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const endpointSecret = getEndpointSecret();
  if (!endpointSecret) {
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Check if this is a marketplace purchase
    if (session.metadata?.type === "marketplace_purchase") {
      const purchaseId = session.metadata.purchaseId;
      const buyerId = session.metadata.buyerId;
      const listingId = session.metadata.listingId;

      if (!purchaseId || !buyerId || !listingId) {
         console.error("Missing metadata for marketplace purchase webhook", session.metadata);
         return NextResponse.json({ received: true });
      }

      try {
        await handleMarketplacePurchase(purchaseId, buyerId, listingId, session);
      } catch (err) {
        console.error("Failed to process marketplace purchase:", err);
      }
    } else if (session.metadata?.type === "balance_topup") {
      const userId = session.metadata.userId;
      const amountUsd = Number(session.metadata.amountUsd);

      if (!userId || isNaN(amountUsd)) {
         console.error("Missing metadata for balance topup webhook", session.metadata);
         return NextResponse.json({ received: true });
      }

      try {
        await prisma.user.update({
          where: { id: userId },
          data: { extraBalanceUsd: { increment: amountUsd } },
        });

        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: session.customer_email ?? userId,
          event: "balance_topup_completed",
          properties: {
            amount_usd: amountUsd,
          },
        });
      } catch (err) {
        console.error("Failed to process balance topup:", err);
      }
    } else if (session.mode === "subscription") {
      // Process affiliate bonus
      const userId = session.metadata?.userId || session.client_reference_id;
      if (userId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, createdAt: true, referredById: true, affiliateBonusPaid: true },
          });

          if (user && user.referredById && !user.affiliateBonusPaid) {
            const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
            const timeSinceSignup = Date.now() - user.createdAt.getTime();
            
            if (timeSinceSignup <= TWO_WEEKS_MS) {
              await prisma.$transaction([
                prisma.user.update({
                  where: { id: user.referredById },
                  data: { affiliateBalanceUsd: { increment: 5 } },
                }),
                prisma.user.update({
                  where: { id: user.id },
                  data: { affiliateBonusPaid: true },
                }),
              ]);
            }
          }
        } catch (err) {
          console.error("Failed to process subscription affiliate bonus:", err);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function handleMarketplacePurchase(purchaseId: string, buyerId: string, listingId: string, session: Stripe.Checkout.Session) {
  // Use a transaction to ensure atomic execution
  await prisma.$transaction(async (tx) => {
    const existingPurchase = await tx.marketplacePurchase.findUnique({
      where: { id: purchaseId }
    });

    if (!existingPurchase) throw new Error("Purchase not found");
    if (existingPurchase.status === "COMPLETED") return; // Idempotency check

    // 2. Fetch the listing and its strategy template
    const listing = await tx.marketplaceListing.findUnique({
      where: { id: listingId },
      include: { strategy: true },
    });

    if (!listing) throw new Error("Listing not found");

    // 3. Clone the strategy to the buyer
    const newStrategy = await tx.strategy.create({
      data: {
        userId: buyerId,
        name: `${listing.strategy.name} (Purchased)`,
        kind: listing.strategy.kind,
        params: listing.strategy.params as any,
      }
    });

    // 1. Mark purchase as completed and set clonedStrategyId
    const purchase = await tx.marketplacePurchase.update({
      where: { id: purchaseId },
      data: { 
        status: "COMPLETED",
        clonedStrategyId: newStrategy.id,
      },
    });

    // 4. Update the listing metrics (sales count and revenue)
    await tx.marketplaceListing.update({
      where: { id: listingId },
      data: { 
        salesCount: { increment: 1 },
        totalRevenue: { increment: purchase.priceUsd },
        totalPlatformFee: { increment: purchase.platformFeeUsd },
        totalSellerEarnings: { increment: purchase.sellerEarningUsd }
      },
    });

    // 5. Credit the seller's balance
    await tx.user.update({
      where: { id: listing.sellerId },
      data: { sellerBalance: { increment: purchase.sellerEarningUsd } },
    });

    const buyerEmail = session.customer_email ?? buyerId;
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: buyerEmail,
      event: "marketplace_purchase_completed",
      properties: {
        listing_id: listingId,
        strategy_name: listing.strategy.name,
        price_usd: Number(purchase.priceUsd),
      },
    });
  });
}
