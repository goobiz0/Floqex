import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Star, ShoppingCart } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { buyStrategy } from "../actions";

export default async function MarketplaceListingPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: params.id, status: "ACTIVE" },
    include: {
      strategy: {
        select: { name: true, params: true }
      },
      seller: {
        select: { firstName: true, lastName: true }
      },
      reviews: {
        include: { buyer: { select: { firstName: true } } },
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });

  if (!listing) notFound();

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Badge tone="neutral" className="w-fit bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            {listing.category}
          </Badge>
          <h1 className="text-4xl font-medium tracking-tight">{listing.title}</h1>
          {listing.tagline && (
            <p className="text-xl text-muted-foreground">{listing.tagline}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>By {listing.seller.firstName || "Anonymous"}</span>
            </div>
            {Number(listing.avgRating) > 0 && (
              <div className="flex items-center gap-1 text-emerald-500">
                <Star weight="fill" className="w-4 h-4 fill-current" />
                <span className="font-medium tnum">{Number(listing.avgRating).toFixed(1)}</span>
                <span className="text-muted-foreground">({listing.reviewCount} reviews)</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              <span>{listing.salesCount} sales</span>
            </div>
          </div>
        </header>

        <section className="prose prose-invert max-w-none prose-emerald">
          {/* Real implementation would use a markdown renderer */}
          <div className="whitespace-pre-wrap">{listing.description}</div>
        </section>

        {listing.reviews.length > 0 && (
          <section className="flex flex-col gap-4 mt-8 pt-8 border-t border-border">
            <h2 className="text-2xl font-medium tracking-tight">Reviews</h2>
            <div className="grid gap-4">
              {listing.reviews.map((review) => (
                <Card key={review.id} className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{review.buyer.firstName || "Anonymous"}</span>
                    <div className="flex items-center gap-1 text-emerald-500">
                      <Star weight="fill" className="w-4 h-4 fill-current" />
                      <span className="font-medium tnum">{review.rating}</span>
                    </div>
                  </div>
                  {review.title && <h4 className="font-medium">{review.title}</h4>}
                  {review.body && <p className="text-muted-foreground text-sm">{review.body}</p>}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="w-full lg:w-[380px] shrink-0 sticky top-24">
        <Card className="p-6 flex flex-col gap-6 border-emerald-500/20 shadow-xl shadow-emerald-900/5">
          <div className="flex justify-between items-end">
            <span className="text-3xl font-mono font-medium">${Number(listing.priceUsd).toFixed(2)}</span>
            <span className="text-sm text-muted-foreground mb-1">One-time payment</span>
          </div>
          
          {listing.edgeScore != null && (
             <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Verified Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <div className="text-2xl font-medium text-emerald-500 tnum">{Number(listing.edgeScore).toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">Edge Score</div>
                   </div>
                   <div>
                      <div className="text-2xl font-medium tnum">{Number(listing.winRate).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                   </div>
                </div>
             </div>
          )}

          <form action={async () => {
             "use server";
             await buyStrategy(listing.id);
          }}>
            <Button type="submit" size="lg" className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 text-white">
              Buy Strategy
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Purchasing will instantly clone this strategy to your account.
            Strategy logic and parameters will be fully visible and customizable.
          </p>
        </Card>
      </div>
    </div>
  );
}
