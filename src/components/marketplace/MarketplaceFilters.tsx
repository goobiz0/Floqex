"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { CaretDown, Funnel, SortAscending } from "@phosphor-icons/react";

export function MarketplaceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams?.get("category") || "all";
  const currentSort = searchParams?.get("sort") || "newest";

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (value === "all" || value === "newest") {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(pathname + "?" + createQueryString("category", e.target.value));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(pathname + "?" + createQueryString("sort", e.target.value));
  };

  const categories = ["all", "Breakout", "Reversion", "Momentum", "Trend", "Volatility", "Scalp"];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2 mb-8">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
        {categories.map((cat) => {
          const isActive = currentCategory === cat;
          const label = cat === "all" ? "All Categories" : cat;
          return (
            <button
              key={cat}
              onClick={() => {
                router.push(pathname + "?" + createQueryString("category", cat));
              }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                isActive 
                  ? "bg-fg text-bg shadow-md" 
                  : "bg-surface/50 text-fg-muted hover:bg-surface hover:text-fg"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <SortAscending className="text-fg-muted" size={18} />
        <div className="relative">
          <select
            value={currentSort}
            onChange={handleSortChange}
            className="h-9 w-40 appearance-none rounded-[var(--radius-button)] border-none bg-surface pl-4 pr-8 text-sm font-medium text-fg shadow-sm transition-colors hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="newest">Newest Arrivals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="popular">Most Popular</option>
          </select>
          <CaretDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted" size={14} />
        </div>
      </div>
    </div>
  );
}
