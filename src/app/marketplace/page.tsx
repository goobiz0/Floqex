import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MarketplacePageClient } from "./page-client";

export const metadata: Metadata = { 
  title: "Strategy Marketplace | Floqex",
  description: "Discover and purchase premium trading strategies."
};

export default async function MarketplacePage() {
  // Fetch active listings, including some author details
  const listings = await prisma.marketplaceListing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      seller: {
        select: {
          firstName: true,
          lastName: true,
          imageUrl: true,
        }
      }
    }
  });

  return <MarketplacePageClient listings={listings} />;
}
