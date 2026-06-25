"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  SquaresFour,
  Robot,
  ChartLineUp,
  Flask,
  Wallet,
  MagnifyingGlass,
  ArrowUpRight,
  ArrowDownRight,
  type Icon,
} from "@phosphor-icons/react";
import { Mark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

/**
 * A branded *skeleton* preview of the Floqex dashboard — same shape and layout
 * (topbar, sidebar, metric cards, equity curve, trade rows) rendered as loading
 * placeholders rather than fabricated data. The only literal mark is the brand
 * glyph; everything else is a shimmer block, with emerald used for structure.
 */

const NAV: { icon: Icon; active?: boolean }[] = [
  { icon: SquaresFour, active: true },
  { icon: Robot },
  { icon: ChartLineUp },
  { icon: Flask },
  { icon: Wallet },
];

// Abstract rising equity line (viewBox 0..520 x 0..150). No axes, no values.
const LINE =
  "M0 120 L40 110 L80 116 L120 96 L160 102 L200 78 L240 86 L280 60 L320 68 L360 44 L400 50 L440 30 L480 36 L520 16";
const AREA = `${LINE} L520 150 L0 150 Z`;

function Bar({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[5px]", className)} aria-hidden />;
}

export function DashboardMockup() {
  const reduce = useReducedMotion();

  const fade = (delay: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 10 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-base text-fg"
      role="img"
      aria-label="Preview of the Floqex dashboard"
    >
      {/* Topbar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-3">
          <Mark className="h-5 w-5" />
          <div className="ml-1 hidden items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface px-2.5 py-1 md:flex">
            <MagnifyingGlass size={11} className="text-fg-faint" />
            <Bar className="h-2 w-20" />
            <span className="ml-1 rounded bg-elevated px-1 py-0.5 font-mono text-[8px] text-fg-faint">
              ⌘K
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2.5 py-1">
            <span className="relative flex h-1.5 w-1.5">
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
            </span>
            <Bar className="h-2 w-12" />
          </div>
          <div className="h-6 w-6 rounded-full bg-accent-soft ring-1 ring-inset ring-accent/20" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 flex-col gap-1 border-r border-line p-3 md:flex">
          <Bar className="mb-1 ml-2 h-2 w-14 opacity-70" />
          {NAV.map((n, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2",
                n.active && "bg-surface shadow-[var(--shadow-sm)]",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-[6px]",
                  n.active ? "bg-accent-soft text-accent" : "text-fg-faint",
                )}
              >
                <n.icon size={13} weight={n.active ? "fill" : "regular"} />
              </span>
              <Bar className={cn("h-2", n.active ? "w-20" : "w-16")} />
            </div>
          ))}
          <div className="mt-auto flex items-center gap-2.5 rounded-[var(--radius-control)] px-1 py-1">
            <div className="h-7 w-7 rounded-full bg-surface" />
            <div className="flex flex-col gap-1">
              <Bar className="h-2 w-16" />
              <Bar className="h-1.5 w-12 opacity-60" />
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <Bar className="h-3 w-24" />
              <Bar className="h-2 w-32 opacity-60" />
            </div>
            <div className="flex items-center gap-0.5 rounded-[var(--radius-pill)] bg-surface p-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-[var(--radius-pill)] px-2.5 py-1",
                    i === 1 && "bg-elevated shadow-[var(--shadow-sm)]",
                  )}
                >
                  <Bar className="h-1.5 w-6" />
                </span>
              ))}
            </div>
          </div>

          {/* Metric cards */}
          <motion.div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" {...fade(0.05)}>
            {[true, true, true, false].map((up, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-control)] border border-line bg-elevated p-3"
              >
                <Bar className="h-2 w-12 opacity-70" />
                <Bar className="mt-2 h-3.5 w-16" />
                <div className="mt-2 flex items-center gap-1">
                  {up ? (
                    <ArrowUpRight size={10} weight="bold" className="text-profit" />
                  ) : (
                    <ArrowDownRight size={10} weight="bold" className="text-negative" />
                  )}
                  <div
                    className={cn(
                      "h-2 w-8 rounded-[5px]",
                      up ? "bg-profit/30" : "bg-negative/30",
                    )}
                  />
                </div>
              </div>
            ))}
          </motion.div>

          {/* Equity curve */}
          <motion.div
            className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-4"
            {...fade(0.12)}
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <Bar className="h-2 w-16 opacity-70" />
                <Bar className="h-3.5 w-24" />
              </div>
              <div className="rounded-[var(--radius-pill)] bg-profit/10 px-2 py-1">
                <div className="h-1.5 w-8 rounded-[5px] bg-profit/40" />
              </div>
            </div>
            <svg
              viewBox="0 0 520 150"
              preserveAspectRatio="none"
              className="mt-2 h-[64%] w-full"
              aria-hidden
            >
              <defs>
                <linearGradient id="mockup-equity-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d={AREA}
                fill="url(#mockup-equity-fill)"
                initial={reduce ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
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
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            </svg>
            <span className="absolute right-4 top-[40%] flex h-2 w-2">
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent ring-2 ring-elevated" />
            </span>
          </motion.div>

          {/* Recent trades */}
          <motion.div
            className="hidden shrink-0 flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-elevated p-3 sm:flex"
            {...fade(0.18)}
          >
            {[true, true, false].map((up, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-[8px]",
                      up ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
                    )}
                  >
                    {up ? (
                      <ArrowUpRight size={13} weight="bold" />
                    ) : (
                      <ArrowDownRight size={13} weight="bold" />
                    )}
                  </span>
                  <div className="flex flex-col gap-1">
                    <Bar className="h-2 w-16" />
                    <Bar className="h-1.5 w-10 opacity-60" />
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-[var(--radius-pill)] px-2.5 py-1",
                    up ? "bg-profit/10" : "bg-negative-soft",
                  )}
                >
                  <div
                    className={cn(
                      "h-2 w-10 rounded-[5px]",
                      up ? "bg-profit/40" : "bg-negative/40",
                    )}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMockup;
