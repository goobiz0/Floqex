import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

const stripe = getStripe();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
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
        await handleMarketplacePurchase(purchaseId, buyerId, listingId);
      } catch (err) {
        console.error("Failed to process marketplace purchase:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function handleMarketplacePurchase(purchaseId: string, buyerId: string, listingId: string) {
  // Use a transaction to ensure atomic execution
  await prisma.$transaction(async (tx) => {
    // 1. Mark purchase as completed
    const purchase = await tx.marketplacePurchase.update({
      where: { id: purchaseId },
      data: { status: "COMPLETED" },
    });

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

    // 4. Update the listing metrics (sales count)
    await tx.marketplaceListing.update({
      where: { id: listingId },
      data: { salesCount: { increment: 1 } },
    });

    // 5. Credit the seller's balance
    await tx.user.update({
      where: { id: listing.sellerId },
      data: { sellerBalance: { increment: purchase.sellerEarningUsd } },
    });
  });
}
