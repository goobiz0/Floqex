"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { formatUSD } from "@/lib/utils";
import { Star, TrendUp, User } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  priceUsd: any; // Decimal
  salesCount: number;
  reviewCount: number;
  avgRating: any;
  winRate: any;
  totalReturnPct: any;
  seller: {
    firstName: string | null;
    lastName: string | null;
  };
};

export function MarketplacePageClient({ listings }: { listings: Listing[] }) {
  // Animation config
  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, ease: "easeOut" }
    }
  };

  const item: any = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Marquee/Header Section */}
      <header className="px-6 pt-24 pb-16 md:px-12 md:pt-32 md:pb-24 max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col gap-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-elevated px-3 py-1 w-fit">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">
              Marketplace Live
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl text-fg">
            High-Signal Strategies,<br />
            <span className="text-fg-subtle">Curated for Alpha.</span>
          </h1>
          <p className="max-w-xl text-lg text-fg-muted mt-2">
            Access robust, forward-tested algorithms created by top quants. Every strategy has been verified in live paper markets before being listed.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <Link 
              href="/dashboard/marketplace/seller" 
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-button)] bg-fg px-4 text-sm font-medium text-bg transition-transform hover:scale-[0.98] active:scale-95"
            >
              Become a Seller
            </Link>
          </div>
        </motion.div>
      </header>

      {/* Grid Section */}
      <main className="px-6 pb-32 md:px-12 max-w-7xl mx-auto">
        {listings.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line">
            <p className="text-fg-muted">No active strategies available yet.</p>
            <Link 
              href="/dashboard/marketplace/seller" 
              className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Be the first to list a strategy &rarr;
            </Link>
          </div>
        ) : (
          <motion.div 
            variants={container} 
            initial="hidden" 
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          >
            {listings.map((listing, i) => {
              // Asymmetric bento sizing: make every 4th item span 2 columns if on large screen
              const isLarge = i % 4 === 0;

              return (
                <motion.div key={listing.id} variants={item} className={isLarge ? "lg:col-span-2" : ""}>
                  <Link href={`/marketplace/${listing.id}`} className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-[var(--radius-card)]">
                    <Card className="h-full flex flex-col p-6 transition-all duration-200 group-hover:bg-elevated/80 group-active:scale-[0.98]">
                      
                      <div className="flex items-start justify-between mb-8">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-widest text-emerald-400 mb-2">
                            {listing.category}
                          </div>
                          <h3 className="text-xl font-medium text-fg group-hover:text-emerald-50 transition-colors">
                            {listing.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-2 text-sm text-fg-subtle">
                            <User size={14} />
                            <span>{listing.seller.firstName || "Anonymous"} {listing.seller.lastName || ""}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-fg">
                            {Number(listing.priceUsd) === 0 ? "Free" : formatUSD(Number(listing.priceUsd))}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-fg-muted mt-1 justify-end">
                            <Star size={12} weight="fill" className={listing.avgRating > 0 ? "text-yellow-500" : "text-fg-muted"} />
                            {Number(listing.avgRating) > 0 ? Number(listing.avgRating).toFixed(1) : "New"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-6 border-t border-line/50 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-fg-muted mb-1">Win Rate</div>
                          <div className="text-lg font-medium text-fg flex items-center gap-1">
                            {listing.winRate ? `${Number(listing.winRate).toFixed(1)}%` : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-fg-muted mb-1">Total Return</div>
                          <div className="text-lg font-medium text-emerald-400 flex items-center gap-1">
                            <TrendUp size={16} />
                            {listing.totalReturnPct ? `${Number(listing.totalReturnPct).toFixed(1)}%` : "N/A"}
                          </div>
                        </div>
                      </div>

                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </div>
  );
}
