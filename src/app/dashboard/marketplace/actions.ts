"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { computeMarketplaceSplits, canListStrategies } from "@/lib/marketplace";
import type { ListingCategory } from "@/lib/marketplace";
import { z } from "zod";
import { redirect } from "next/navigation";

export async function createListing(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !canListStrategies(user.plan)) {
    throw new Error("Your current plan does not support listing strategies on the marketplace.");
  }

  const schema = z.object({
    strategyId: z.string(),
    title: z.string().min(5).max(100),
    tagline: z.string().max(200).optional(),
    description: z.string().min(20).max(5000),
    category: z.enum(["Breakout", "Reversion", "Momentum", "Trend", "Volatility", "Scalp"]),
    priceUsd: z.coerce.number().min(5).max(999),
  });

  const parsed = schema.parse({
    strategyId: formData.get("strategyId"),
    title: formData.get("title"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    category: formData.get("category"),
    priceUsd: formData.get("priceUsd"),
  });

  // Verify the strategy belongs to the user and is custom (or we allow preset mods)
  const strategy = await prisma.strategy.findUnique({
    where: { id: parsed.strategyId, userId },
  });
  if (!strategy) throw new Error("Strategy not found");

  // We should theoretically snapshot the edge score here, but for now we'll 
  // allow the listing to be created in DRAFT and the user can run validation
  // to bake the stats.

  const listing = await prisma.marketplaceListing.create({
    data: {
      sellerId: userId,
      strategyId: parsed.strategyId,
      title: parsed.title,
      tagline: parsed.tagline || null,
      description: parsed.description,
      category: parsed.category,
      priceUsd: parsed.priceUsd,
      status: "DRAFT",
    },
  });

  revalidatePath("/dashboard/marketplace/seller");
  redirect(`/dashboard/marketplace/seller/${listing.id}/edit`);
}

export async function updateListingStatus(listingId: string, status: "DRAFT" | "ACTIVE" | "PAUSED") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId, sellerId: userId },
  });
  if (!listing) throw new Error("Listing not found");

  // Require stats to be baked before activating
  if (status === "ACTIVE" && listing.edgeScore == null) {
    throw new Error("You must run a validation on this strategy to bake its performance stats before activating the listing.");
  }

  await prisma.marketplaceListing.update({
    where: { id: listingId },
    data: { status },
  });

  revalidatePath("/dashboard/marketplace");
  revalidatePath(`/dashboard/marketplace/${listingId}`);
  revalidatePath("/dashboard/marketplace/seller");
}

export async function buyStrategy(listingId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId, status: "ACTIVE" },
  });
  
  if (!listing) throw new Error("Listing not available");
  if (listing.sellerId === userId) throw new Error("You cannot buy your own strategy");

  // Check if already purchased
  const existing = await prisma.marketplacePurchase.findFirst({
    where: { buyerId: userId, listingId, status: "COMPLETED" },
  });
  if (existing) throw new Error("You already own this strategy");

  const { platformFeeUsd, sellerEarningUsd } = computeMarketplaceSplits(Number(listing.priceUsd));

  // Create pending purchase
  const purchase = await prisma.marketplacePurchase.create({
    data: {
      buyerId: userId,
      listingId,
      priceUsd: listing.priceUsd,
      platformFeeUsd,
      sellerEarningUsd,
      status: "PENDING",
    },
  });

  // Create Stripe Checkout Session
  const session = await getStripe().checkout.sessions.create({
    customer: user.stripeCustomerId || undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Strategy: ${listing.title}`,
            description: listing.tagline || `Purchased from the Floqex Strategy Marketplace`,
          },
          unit_amount: Math.round(Number(listing.priceUsd) * 100), // in cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "marketplace_purchase",
      purchaseId: purchase.id,
      buyerId: userId,
      listingId: listing.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/marketplace/${listing.id}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/marketplace/${listing.id}?purchase=cancelled`,
  });

  await prisma.marketplacePurchase.update({
    where: { id: purchase.id },
    data: { stripeSessionId: session.id },
  });

  redirect(session.url!);
}

export async function requestWithdrawal(amountUsd: number, payoutEmail: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (amountUsd < 50) {
    throw new Error("Minimum withdrawal amount is $50.00");
  }

  if (Number(user.sellerBalance) < amountUsd) {
    throw new Error("Insufficient balance");
  }

  // Deduct balance and create request in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { 
        sellerBalance: { decrement: amountUsd },
        payoutEmail // Save for future use
      },
    }),
    prisma.withdrawalRequest.create({
      data: {
        userId,
        amountUsd,
        payoutEmail,
        status: "PENDING",
      },
    }),
  ]);

  revalidatePath("/dashboard/marketplace/seller");
}

export async function submitReview(listingId: string, rating: number, title?: string, body?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify they purchased it
  const purchase = await prisma.marketplacePurchase.findFirst({
    where: { buyerId: userId, listingId, status: "COMPLETED" },
  });
  
  if (!purchase) {
    throw new Error("You must purchase this strategy to leave a review");
  }

  await prisma.marketplaceReview.upsert({
    where: {
      buyerId_listingId: { buyerId: userId, listingId }
    },
    create: {
      buyerId: userId,
      listingId,
      rating,
      title,
      body,
    },
    update: {
      rating,
      title,
      body,
    }
  });

  // Update aggregated rating on the listing
  const allReviews = await prisma.marketplaceReview.findMany({
    where: { listingId },
    select: { rating: true },
  });
  
  const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await prisma.marketplaceListing.update({
    where: { id: listingId },
    data: {
      reviewCount: allReviews.length,
      avgRating: avg,
    }
  });

  revalidatePath(`/dashboard/marketplace/${listingId}`);
}
