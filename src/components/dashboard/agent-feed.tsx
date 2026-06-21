"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type FeedEntry = { t: string; text: string; tone?: "in" | "out" | "warn" };

const toneColor: Record<NonNullable<FeedEntry["tone"]>, string> = {
  in: "text-accent",
  out: "text-positive",
  warn: "text-warning",
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
        {entries.map((entry, i) => (
          <motion.div
            key={`${entry.t}-${i}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.04, ease: [0.23, 1, 0.32, 1] }}
            className="flex gap-3"
          >
            <span className="shrink-0 text-accent/80">{entry.t}</span>
            <span className={cn("text-fg-muted", entry.tone && toneColor[entry.tone])}>
              {entry.text}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
