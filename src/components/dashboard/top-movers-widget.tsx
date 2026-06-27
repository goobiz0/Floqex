"use client";

import { useState, useEffect } from "react";
import { TrendUp, TrendDown, RocketLaunch } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type Mover = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: string;
};

// Simulated mock data since we don't have a live market data feed for this widget yet.
const GAINERS: Mover[] = [
  { symbol: "NVDA", name: "NVIDIA Corp", price: 120.45, change: 8.32, changePct: 7.42, volume: "45.2M" },
  { symbol: "BTC", name: "Bitcoin", price: 68420.00, change: 3200.50, changePct: 4.91, volume: "12.4B" },
  { symbol: "AAPL", name: "Apple Inc", price: 192.15, change: 4.25, changePct: 2.26, volume: "22.1M" },
];

const LOSERS: Mover[] = [
  { symbol: "TSLA", name: "Tesla Inc", price: 165.20, change: -12.40, changePct: -6.98, volume: "35.8M" },
  { symbol: "ETH", name: "Ethereum", price: 3420.50, change: -120.20, changePct: -3.39, volume: "5.1B" },
  { symbol: "META", name: "Meta Platforms", price: 480.12, change: -8.45, changePct: -1.73, volume: "14.2M" },
];

export function TopMoversWidget() {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const data = tab === "gainers" ? GAINERS : LOSERS;
  
  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <RocketLaunch size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Top Movers</h3>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-surface p-0.5">
          <button 
            onClick={() => setTab("gainers")}
            className={cn("px-2 py-1 text-[10px] font-medium rounded-full transition-colors", tab === "gainers" ? "bg-accent text-[var(--color-on-accent)]" : "text-fg-subtle hover:text-fg")}
          >
            Gainers
          </button>
          <button 
            onClick={() => setTab("losers")}
            className={cn("px-2 py-1 text-[10px] font-medium rounded-full transition-colors", tab === "losers" ? "bg-accent text-[var(--color-on-accent)]" : "text-fg-subtle hover:text-fg")}
          >
            Losers
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {data.map((item, i) => (
          <motion.div 
            key={item.symbol} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between group rounded-[var(--radius-card)] border border-transparent p-2 hover:bg-surface hover:border-line transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full bg-surface",
                item.change > 0 ? "text-profit" : "text-negative"
              )}>
                {item.change > 0 ? <TrendUp size={16} weight="bold" /> : <TrendDown size={16} weight="bold" />}
              </div>
              <div>
                <p className="text-sm font-semibold">{item.symbol}</p>
                <p className="text-[11px] text-fg-subtle">{item.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="tnum text-sm font-semibold tracking-tight">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className={cn("tnum text-[11px] font-medium mt-0.5", item.change > 0 ? "text-profit" : "text-negative")}>
                {item.change > 0 ? "+" : ""}{item.changePct.toFixed(2)}%
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
