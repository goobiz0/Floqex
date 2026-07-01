import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Storefront, User, Star } from "@phosphor-icons/react";

export default async function MarketplacePage() {
  const listings = await prisma.marketplaceListing.findMany({
    where: { status: "ACTIVE" },
    include: {
      strategy: {
        select: { name: true, params: true }
      },
      seller: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground text-lg">
          Discover and purchase proven, battle-tested strategies from top algorithmic traders.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <Link href={`/dashboard/marketplace/${listing.id}`} key={listing.id} className="group">
            <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 hover:border-emerald-500/20 active:scale-[0.98]">
              <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="flex justify-between items-start gap-4">
                  <Badge tone="neutral" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {listing.category}
                  </Badge>
                  <span className="font-mono font-medium">${Number(listing.priceUsd).toFixed(2)}</span>
                </div>
                
                <div className="space-y-1 mt-2">
                  <h3 className="font-semibold text-lg tracking-tight group-hover:text-emerald-400 transition-colors">
                    {listing.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {listing.tagline || listing.description}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{listing.seller.firstName || "Anonymous"}</span>
                  </div>
                  {Number(listing.avgRating) > 0 && (
                    <div className="flex items-center gap-1 text-emerald-500">
                      <Star weight="fill" className="w-4 h-4 fill-current" />
                      <span className="font-medium tnum">{Number(listing.avgRating).toFixed(1)}</span>
                      <span className="text-muted-foreground">({listing.reviewCount})</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {listings.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed rounded-xl">
            <Storefront className="w-8 h-8 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No strategies available</h3>
            <p className="text-muted-foreground">Check back later for new listings.</p>
          </div>
        )}
      </section>
    </div>
  );
}
