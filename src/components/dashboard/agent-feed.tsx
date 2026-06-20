"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type Entry = { t: string; text: string; tone?: "in" | "out" | "warn" };

const ENTRIES: Entry[] = [
  { t: "09:30:00", text: "NY session open. Capturing opening range for XAU, NQ, ES." },
  { t: "09:45:00", text: "XAU range = 4.20 (0.9x normal). Healthy. Watching for breakout." },
  { t: "09:52:14", text: "XAU closed above range high. Long entry @ 2418.60.", tone: "in" },
  { t: "10:18:02", text: "News check: no high-impact USD events in window." },
  { t: "10:41:37", text: "NQ range = 38.5 (2.4x normal). Too wide, skipping NQ.", tone: "warn" },
  { t: "11:06:55", text: "XAU target hit @ 2427.00. Closed +2.0R.", tone: "out" },
  { t: "11:07:01", text: "Re-entry armed. Waiting for pullback inside range." },
  { t: "11:30:00", text: "Asia session closed. 1 trade, +1.84% on the day." },
];

const toneColor: Record<NonNullable<Entry["tone"]>, string> = {
  in: "text-accent",
  out: "text-positive",
  warn: "text-warning",
};

export function AgentFeed() {
  const reduce = useReducedMotion();
  return (
    <div className="h-72 overflow-y-auto rounded-[var(--radius-control)] bg-base/60 p-4 font-mono text-[0.8rem] leading-relaxed">
      <div className="flex flex-col gap-1.5">
        {ENTRIES.map((e, i) => (
          <motion.div
            key={e.t + i}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
            className="flex gap-3"
          >
            <span className="shrink-0 text-accent/80">{e.t}</span>
            <span className={cn("text-fg-muted", e.tone && toneColor[e.tone])}>
              {e.text}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
