"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { formatUSD } from "@/lib/utils";
import { Star, ShieldCheck, Handshake, CodeBlock, TrendUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ReviewDialog } from "@/components/marketplace/ReviewDialog";

export function ListingPageClient({ listing, hasPurchased, isOwner }: any) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const router = useRouter();

  async function handleCheckout() {
    try {
      setIsCheckingOut(true);
      const res = await fetch("/api/checkout/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      toast.error("Checkout failed", { description: err.message });
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg pb-32">
      {/* Header Area */}
      <div className="border-b border-line bg-elevated/30">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 md:px-12 flex flex-col md:flex-row gap-8 justify-between items-start">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                {listing.category}
              </span>
              <div className="flex items-center gap-1 text-sm text-yellow-500">
                <Star weight="fill" size={14} />
                <span className="font-medium text-fg">{Number(listing.avgRating) > 0 ? Number(listing.avgRating).toFixed(1) : "New"}</span>
                <span className="text-fg-muted">({listing.reviewCount} reviews)</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-fg mb-4">
              {listing.title}
            </h1>
            <p className="text-lg text-fg-muted leading-relaxed">
              {listing.description}
            </p>
          </motion.div>

          {/* Checkout Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full md:w-80 shrink-0"
          >
            <Card className="p-6">
              <div className="text-3xl font-semibold mb-6">
                {Number(listing.priceUsd) === 0 ? "Free" : formatUSD(Number(listing.priceUsd))}
              </div>
              
              <Button 
                onClick={handleCheckout}
                disabled={isCheckingOut || hasPurchased || isOwner}
                className="w-full mb-4 bg-emerald-500 text-black hover:bg-emerald-400"
              >
                {isCheckingOut ? "Loading..." : 
                 isOwner ? "Your Strategy" : 
                 hasPurchased ? "Purchased" : "Buy Strategy"}
              </Button>

              <div className="space-y-3 text-sm text-fg-muted">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Forward-test verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CodeBlock size={16} className="text-emerald-400" />
                  <span>Instant clone to your account</span>
                </div>
                <div className="flex items-center gap-2">
                  <Handshake size={16} className="text-emerald-400" />
                  <span>100% secure via Stripe</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Left Column: Stats & Author */}
        <div className="md:col-span-2 space-y-12">
          <section>
            <h2 className="text-xl font-medium mb-6">Performance Snapshot</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-line bg-elevated/50">
                <div className="text-xs text-fg-muted mb-1">Win Rate</div>
                <div className="text-2xl font-medium">{listing.winRate ? `${Number(listing.winRate).toFixed(1)}%` : "N/A"}</div>
              </div>
              <div className="p-4 rounded-xl border border-line bg-elevated/50">
                <div className="text-xs text-fg-muted mb-1">Total Return</div>
                <div className="text-2xl font-medium text-emerald-400">{listing.totalReturnPct ? `${Number(listing.totalReturnPct).toFixed(1)}%` : "N/A"}</div>
              </div>
              <div className="p-4 rounded-xl border border-line bg-elevated/50">
                <div className="text-xs text-fg-muted mb-1">Max Drawdown</div>
                <div className="text-2xl font-medium">{listing.maxDrawdownPct ? `${Number(listing.maxDrawdownPct).toFixed(1)}%` : "N/A"}</div>
              </div>
              <div className="p-4 rounded-xl border border-line bg-elevated/50">
                <div className="text-xs text-fg-muted mb-1">Trades</div>
                <div className="text-2xl font-medium">{listing.tradeCount || "N/A"}</div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Reviews</h2>
              {hasPurchased && (
                <Button variant="outline" size="sm" onClick={() => setIsReviewOpen(true)}>
                  Leave a Review
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              {listing.reviews.length === 0 ? (
                <p className="text-fg-muted text-sm">No reviews yet.</p>
              ) : (
                listing.reviews.map((review: any) => (
                  <div key={review.id} className="p-4 rounded-xl border border-line bg-elevated/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">
                        {review.buyer.firstName || "Anonymous"} {review.buyer.lastName || ""}
                      </div>
                      <div className="flex items-center text-yellow-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} weight={i < Number(review.rating) ? "fill" : "regular"} size={12} />
                        ))}
                      </div>
                    </div>
                    {review.title && <div className="text-sm font-medium mb-1">{review.title}</div>}
                    <p className="text-sm text-fg-muted">{review.body}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Seller Info */}
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-fg-subtle mb-6">Creator</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-line flex items-center justify-center text-lg font-medium">
              {(listing.seller.firstName?.[0] || "A").toUpperCase()}
            </div>
            <div>
              <div className="font-medium">{listing.seller.firstName || "Anonymous"} {listing.seller.lastName || ""}</div>
              <div className="text-xs text-fg-muted">Strategy Creator</div>
            </div>
          </div>
        </div>
      </div>
      
      {hasPurchased && (
        <ReviewDialog 
          listingId={listing.id} 
          isOpen={isReviewOpen} 
          onClose={() => setIsReviewOpen(false)} 
        />
      )}
    </div>
  );
}
