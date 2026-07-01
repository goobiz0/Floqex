import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getOrCreateUser } from "@/lib/user";
import { z } from "zod";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

const CheckoutMarketplaceSchema = z.object({
  listingId: z.string().max(100),
}).strict();

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const rateLimitSuccess = await checkRateLimit(`checkout_marketplace_${ip}`, 10, "1 m");
    if (!rateLimitSuccess) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Invalid JSON payload", { status: 400 });
    }

    const parsedBody = CheckoutMarketplaceSchema.safeParse(body);
    if (!parsedBody.success) {
      return new NextResponse(parsedBody.error.message, { status: 400 });
    }

    const { listingId } = parsedBody.data;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return new NextResponse("Listing not found", { status: 404 });
    }

    if (listing.status !== "ACTIVE") {
      return new NextResponse("Listing is not active", { status: 400 });
    }

    if (listing.sellerId === user.id) {
      return new NextResponse("Cannot purchase your own listing", { status: 400 });
    }

    const priceUsd = Number(listing.priceUsd);
    const platformFeeUsd = priceUsd * 0.30;
    const sellerEarningUsd = priceUsd * 0.70;

    // Create a pending purchase record
    const purchase = await prisma.marketplacePurchase.create({
      data: {
        buyerId: user.id,
        listingId: listing.id,
        priceUsd: listing.priceUsd,
        platformFeeUsd: platformFeeUsd,
        sellerEarningUsd: sellerEarningUsd,
        status: "PENDING",
      },
    });

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: listing.title,
              description: `Strategy: ${listing.title} from Floqex Marketplace`,
            },
            unit_amount: Math.round(priceUsd * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/marketplace/${listing.id}?success=true`,
      cancel_url: `${appUrl}/marketplace/${listing.id}?canceled=true`,
      metadata: {
        type: "marketplace_purchase",
        purchaseId: purchase.id,
        buyerId: user.id,
        listingId: listing.id,
      },
    });

    // Update the purchase with the Stripe session ID
    if (session.id) {
      await prisma.marketplacePurchase.update({
        where: { id: purchase.id },
        data: { stripeSessionId: session.id },
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[MARKETPLACE_CHECKOUT]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
