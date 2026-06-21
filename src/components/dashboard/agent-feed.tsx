"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type AgentEventKind = "INFO" | "SIGNAL" | "TRADE" | "RISK" | "NEWS" | "ADJUST";
export type FeedEntry = { id: string; t: string; kind: AgentEventKind; message: string };

// Kind carries both a colour and a short label, so meaning never rests on
// colour alone (a11y). One brand accent; the rest are semantic data tones.
const KIND: Record<AgentEventKind, { color: string; label: string }> = {
  INFO: { color: "text-fg-subtle", label: "info" },
  SIGNAL: { color: "text-accent", label: "signal" },
  TRADE: { color: "text-profit", label: "trade" },
  RISK: { color: "text-negative", label: "risk" },
  NEWS: { color: "text-warning", label: "news" },
  ADJUST: { color: "text-accent", label: "tune" },
};

export function AgentFeed({ entries }: { entries: FeedEntry[] }) {
  const reduce = useReducedMotion();

  if (!entries.length) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] bg-base/60 p-4 text-center">
        <p className="text-sm text-fg-muted">No activity yet</p>
        <p className="text-xs text-fg-subtle">
          Your bot narrates every decision here once it starts a session.
        </p>
      </div>
    );
  }

  return (
    <div className="h-72 overflow-y-auto rounded-[var(--radius-control)] bg-base/60 p-4 font-mono text-[0.8rem] leading-relaxed">
      <div className="flex flex-col gap-1.5">
        {entries.map((entry, i) => {
          const meta = KIND[entry.kind] ?? KIND.INFO;
          return (
            <motion.div
              key={entry.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.04, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-baseline gap-3"
            >
              <span className="shrink-0 tabular-nums text-fg-faint">{entry.t}</span>
              <span
                className={cn(
                  "w-12 shrink-0 text-[0.65rem] font-medium uppercase tracking-wide",
                  meta.color,
                )}
              >
                {meta.label}
              </span>
              <span className="text-fg-muted">{entry.message}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
