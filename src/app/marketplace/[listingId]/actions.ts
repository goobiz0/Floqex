"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function reportListing(listingId: string, reason: string) {
  const { userId: clerkId } = await auth();
  
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: { seller: true }
  });

  if (!listing) throw new Error("Listing not found");

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🚨 **New Listing Report**\n**Listing:** ${listing.title} (${listingId})\n**Seller:** ${listing.seller.firstName} ${listing.seller.lastName} (${listing.seller.email})\n**Reported By (Clerk ID):** ${clerkId || "Anonymous"}\n**Reason:** ${reason}`
        })
      });
    } catch (e) {
      console.error("Failed to send report to Discord:", e);
    }
  }
}

export async function submitReview(listingId: string, rating: number, title: string, body: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (user.createdAt > thirtyDaysAgo) {
    throw new Error("You must have been on Floqex for longer than a month to review a strategy.");
  }

  // Verify the user actually purchased this
  const purchase = await prisma.marketplacePurchase.findFirst({
    where: {
      buyerId: user.id,
      listingId,
      status: "COMPLETED"
    }
  });

  if (!purchase) {
    throw new Error("You must purchase this strategy to leave a review.");
  }

  // Ensure they haven't already reviewed it
  const existingReview = await prisma.marketplaceReview.findFirst({
    where: {
      buyerId: user.id,
      listingId
    }
  });

  if (existingReview) {
    throw new Error("You have already reviewed this strategy.");
  }

  // Use transaction to create review and update listing stats safely
  await prisma.$transaction(async (tx) => {
    await tx.marketplaceReview.create({
      data: {
        buyerId: user.id,
        listingId,
        rating,
        title,
        body
      }
    });

    const allReviews = await tx.marketplaceReview.findMany({
      where: { listingId },
      select: { rating: true }
    });

    const reviewCount = allReviews.length;
    const avgRating = allReviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviewCount;

    await tx.marketplaceListing.update({
      where: { id: listingId },
      data: {
        reviewCount,
        avgRating
      }
    });
  });

  revalidatePath(`/marketplace/${listingId}`);
}
