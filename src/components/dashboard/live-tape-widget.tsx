"use client";

import { useEffect, useState } from "react";
import { ListDashes, TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type TapeItem = {
  id: string;
  instrument: string;
  direction: "LONG" | "SHORT";
  price: string;
  size: string;
  timestamp: Date;
};

const PAIRS = ["EUR/USD", "BTC/USD", "AAPL", "XAU/USD", "GBP/JPY", "TSLA"];

export function LiveTapeWidget({ rows = 6 }: { rows?: number }) {
  const [items, setItems] = useState<TapeItem[]>([]);

  useEffect(() => {
    // Generate initial rows
    const initial: TapeItem[] = Array.from({ length: rows }).map((_, i) => ({
      id: Math.random().toString(),
      instrument: PAIRS[Math.floor(Math.random() * PAIRS.length)],
      direction: Math.random() > 0.5 ? "LONG" : "SHORT",
      price: (Math.random() * 1000).toFixed(2),
      size: (Math.random() * 10).toFixed(2),
      timestamp: new Date(Date.now() - i * 5000),
    }));
    setItems(initial);

    const timer = setInterval(() => {
      setItems((prev) => {
        const newItem: TapeItem = {
          id: Math.random().toString(),
          instrument: PAIRS[Math.floor(Math.random() * PAIRS.length)],
          direction: Math.random() > 0.5 ? "LONG" : "SHORT",
          price: (Math.random() * 1000).toFixed(2),
          size: (Math.random() * 10).toFixed(2),
          timestamp: new Date(),
        };
        const next = [newItem, ...prev];
        if (next.length > rows) return next.slice(0, rows);
        return next;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [rows]);

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <ListDashes size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Order Book Tape</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <span className="text-xs text-accent font-medium">LIVE</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden p-2">
        <div className="flex text-[10px] uppercase font-bold tracking-widest text-fg-subtle px-3 pb-2 border-b border-line/50 mb-2">
          <div className="w-8"></div>
          <div className="flex-1">Asset</div>
          <div className="w-16 text-right">Size</div>
          <div className="w-20 text-right">Price</div>
        </div>
        
        <div className="relative h-full flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const isLong = item.direction === "LONG";
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex items-center text-xs font-mono px-3 py-1.5 rounded-[var(--radius-control)] bg-surface/50 border border-line/50"
                >
                  <div className={cn("w-8", isLong ? "text-profit" : "text-negative")}>
                    {isLong ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
                  </div>
                  <div className="flex-1 font-medium">{item.instrument}</div>
                  <div className="w-16 text-right text-fg-subtle">{item.size}</div>
                  <div className="w-20 text-right font-semibold">{item.price}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
