"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkActionRateLimit } from "@/lib/ratelimit";

const ReportListingSchema = z.object({
  listingId: z.string().max(100),
  reason: z.string().min(5).max(1000),
}).strict();

const SubmitReviewSchema = z.object({
  listingId: z.string().max(100),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(2000),
}).strict();

export async function reportListing(listingId: string, reason: string) {
  const parsed = ReportListingSchema.safeParse({ listingId, reason });
  if (!parsed.success) throw new Error(parsed.error.message);

  const rateLimitOk = await checkActionRateLimit("reportListing", 5, "1 m");
  if (!rateLimitOk) throw new Error("Rate limit exceeded");

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
  const parsed = SubmitReviewSchema.safeParse({ listingId, rating, title, body });
  if (!parsed.success) throw new Error(parsed.error.message);

  const rateLimitOk = await checkActionRateLimit("submitReview", 5, "1 m");
  if (!rateLimitOk) throw new Error("Rate limit exceeded");

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
