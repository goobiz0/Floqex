"use client";

import { ListDashes, TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { TradeRow } from "@/lib/queries";
import { WidgetShell } from "./widget-kit";

// Real execution tape: the account's most recent fills (entry price + size +
// direction), newest first. Driven by live + server trade data, not random
// generators. Shows an empty state until the bot has executed.
export function LiveTapeWidget({
  rows = 6,
  trades = [],
  isLive = false,
}: {
  rows?: number;
  trades?: TradeRow[];
  isLive?: boolean;
}) {
  const items = [...trades]
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .slice(0, rows);

  return (
    <WidgetShell
      title="Execution Tape"
      icon={<ListDashes size={16} weight="duotone" />}
      right={
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
          )}
          <span className={cn("text-xs font-medium", isLive ? "text-accent" : "text-fg-subtle")}>
            {isLive ? "LIVE" : "RECENT"}
          </span>
        </div>
      }
    >
      <div className="flex-1 overflow-hidden p-2">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-xs text-fg-subtle">Fills stream in here once your bot executes.</p>
          </div>
        ) : (
          <>
            <div className="mb-2 flex border-b border-line/50 px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
              <div className="w-8" />
              <div className="flex-1">Asset</div>
              <div className="w-16 text-right">Size</div>
              <div className="w-20 text-right">Entry</div>
            </div>
            <div className="relative flex h-full flex-col gap-1">
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const isLong = item.direction === "LONG";
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="flex items-center rounded-[var(--radius-control)] border border-line/50 bg-surface/50 px-3 py-1.5 font-mono text-xs"
                    >
                      <div className={cn("w-8", isLong ? "text-profit" : "text-negative")}>
                        {isLong ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
                      </div>
                      <div className="flex-1 font-medium">{item.instrument}</div>
                      <div className="tnum w-16 text-right text-fg-subtle">{item.sizeUnits.toLocaleString()}</div>
                      <div className="tnum w-20 text-right font-semibold">
                        {item.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </WidgetShell>
  );
}
