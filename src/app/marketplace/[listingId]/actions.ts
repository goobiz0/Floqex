"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitReview(listingId: string, rating: number, title: string, body: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

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
