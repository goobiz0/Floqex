"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowsClockwise,
  CheckCircle,
  Lightning,
  ShieldCheck,
  type Icon,
} from "@phosphor-icons/react";
import { Mark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

/**
 * Hero brand visual: an honest, illustrative preview of the Floqex agent at work.
 * The equity line is an abstract draw-on (no axes, no claimed account values) and
 * the feed shows decision *states* the agent narrates, never fabricated P&L. It is
 * a brand instrument, labelled as a preview, in the spirit of the shipped skeleton
 * mockups. Tokens only; emerald is structural, profit-green is never the brand.
 */

const LINE =
  "M0 116 L34 108 L68 112 L102 88 L136 94 L170 72 L204 80 L238 54 L272 62 L306 38 L340 44 L374 24 L408 30 L440 12";
const AREA = `${LINE} L440 140 L0 140 Z`;

type FeedItem = { icon: Icon; label: string; meta: string };

const FEED: FeedItem[] = [
  { icon: ArrowsClockwise, label: "Scanning EURUSD", meta: "1m timeframe" },
  { icon: Lightning, label: "Signal confirmed", meta: "Breakout rule" },
  { icon: ShieldCheck, label: "Risk check passed", meta: "Within drawdown cap" },
  { icon: CheckCircle, label: "Order placed at broker", meta: "Long, bracketed" },
];

export function LiveInstrument({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const gradientId = useId();

  return (
    <div
      role="img"
      aria-label="Preview of the Floqex agent placing a trade and reporting each step"
      className={cn(
        "relative w-full rounded-[var(--radius-lg)] border border-line bg-elevated p-5",
        className,
      )}
    >
      {/* soft emerald aura behind the panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[var(--radius-lg)] [background:radial-gradient(60%_50%_at_30%_0%,var(--color-accent-soft),transparent_70%)]"
      />

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mark className="h-6 w-6" />
            <span className="text-sm font-medium text-fg">Agent session</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2.5 py-1 text-[0.7rem] font-medium text-fg-muted">
            <span className="relative flex h-1.5 w-1.5">
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Live
          </span>
        </div>

        {/* equity instrument */}
        <div className="mt-5 rounded-[var(--radius-card)] border border-line bg-base p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg-subtle">
              Equity curve
            </span>
            <span className="rounded-[var(--radius-pill)] bg-accent-soft px-2 py-0.5 text-[0.7rem] font-medium text-accent">
              Trending up
            </span>
          </div>
          <svg
            viewBox="0 0 440 140"
            preserveAspectRatio="none"
            className="mt-3 h-28 w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d={AREA}
              fill={`url(#${gradientId})`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.8 }}
            />
            <motion.path
              d={LINE}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
            />
          </svg>
        </div>

        {/* decision feed */}
        <ul className="mt-3 flex flex-col gap-1.5">
          {FEED.map((item, i) => (
            <motion.li
              key={item.label}
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.45,
                delay: 0.5 + i * 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex items-center gap-3 rounded-[var(--radius-control)] border border-line bg-surface/60 px-3 py-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                <item.icon size={15} weight="fill" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                {item.label}
              </span>
              <span className="shrink-0 text-xs text-fg-subtle">{item.meta}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
