import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ListingPageClient } from "./page-client";

export const metadata: Metadata = { 
  title: "Strategy Details | Floqex Marketplace",
};

export default async function ListingPage(props: { params: Promise<{ listingId: string }> }) {
  const params = await props.params;
  const { listingId } = params;
  
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: { id: true, firstName: true, lastName: true, imageUrl: true }
      },
      strategy: true,
      reviews: {
        include: {
          buyer: {
            select: { firstName: true, lastName: true, imageUrl: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });

  if (!listing || listing.status !== "ACTIVE") {
    return notFound();
  }

  // Check if current user has purchased this strategy
  const { userId: clerkId } = await auth();
  let hasPurchased = false;
  let isOwner = false;

  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) {
      isOwner = user.id === listing.sellerId;
      const purchase = await prisma.marketplacePurchase.findFirst({
        where: {
          buyerId: user.id,
          listingId: listing.id,
          status: "COMPLETED"
        }
      });
      if (purchase) hasPurchased = true;
    }
  }

  return (
    <ListingPageClient 
      listing={listing} 
      hasPurchased={hasPurchased} 
      isOwner={isOwner} 
    />
  );
}
