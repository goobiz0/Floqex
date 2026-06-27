"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  Lightning,
  ShieldCheck,
  TreeStructure,
  Broadcast,
  Notebook,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Feature bento: an asymmetric 5-cell grid (2+1 over 1+1+1) with real visual
 * variation, not five text-only cards. Tokens only; border XOR shadow; emerald
 * stays the single accent. Numbers shown are abstract structure, not claimed
 * account performance.
 */

function CellShell({
  icon: IconCmp,
  title,
  body,
  className,
  children,
}: {
  icon: Icon;
  title: string;
  body: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-7 transition-colors duration-300 hover:border-line-strong",
        className,
      )}
    >
      {children}
      <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
        <IconCmp size={22} weight="fill" />
      </span>
      <h3 className="relative z-10 mt-auto pt-8 text-xl font-semibold tracking-tight text-fg">
        {title}
      </h3>
      <p className="relative z-10 mt-2 max-w-sm text-[0.95rem] leading-relaxed text-fg-muted">
        {body}
      </p>
    </div>
  );
}

/* small inline visuals */

function LatencyVisual() {
  const bars = [38, 22, 46, 30, 18, 52, 34, 14, 44, 26, 50];
  return (
    <div className="pointer-events-none absolute right-7 top-7 hidden items-end gap-1 sm:flex">
      <div className="flex h-14 items-end gap-1 opacity-60">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-[2px] bg-accent"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function DrawdownVisual() {
  return (
    <div className="pointer-events-none absolute right-7 top-7 w-28 rounded-[var(--radius-control)] border border-line bg-base p-3">
      <div className="flex items-baseline gap-1">
        <span className="tnum text-lg font-semibold text-fg">1.2</span>
        <span className="text-xs text-fg-subtle">/ 2.0%</span>
      </div>
      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface">
        <div className="absolute inset-y-0 left-[60%] w-px bg-negative" />
        <div className="h-full w-[36%] rounded-[var(--radius-pill)] bg-accent" />
      </div>
    </div>
  );
}

function FeedVisual() {
  return (
    <div className="pointer-events-none absolute right-6 top-7 flex w-32 flex-col gap-1.5 opacity-80">
      {[18, 24, 16].map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-base px-2 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span
            className="h-1.5 rounded-[var(--radius-pill)] bg-surface-hover"
            style={{ width: `${w * 4}px` }}
          />
        </div>
      ))}
    </div>
  );
}

export function FeatureBento() {
  const reduce = useReducedMotion();

  return (
    <section
      id="features"
      className="relative border-y border-line bg-base py-24 md:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg md:text-4xl">
            One engine for the whole loop.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Build, test, execute and review without stitching together five
            tools. The hard infrastructure is handled so you can focus on the
            edge.
          </p>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-5 md:grid-cols-3"
        >
          <CellShell
            icon={Lightning}
            title="Broker-level execution"
            body="Orders fire in milliseconds, directly at your broker, so what you backtest is close to what you fill."
            className="md:col-span-2"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 [background:radial-gradient(70%_90%_at_85%_0%,var(--color-accent-soft),transparent_60%)]"
            />
            <LatencyVisual />
          </CellShell>

          <CellShell
            icon={ShieldCheck}
            title="Risk limits that hold"
            body="Set a daily drawdown cap and max position size. The engine enforces them and stands the bot down when a limit is hit."
          >
            <DrawdownVisual />
          </CellShell>

          <CellShell
            icon={TreeStructure}
            title="Visual strategy builder"
            body="Compose conditions as connected blocks and tune them in place. Read the logic at a glance."
          >
            <div className="pointer-events-none absolute right-7 top-7 flex flex-col items-end gap-1.5 opacity-80">
              <span className="rounded-[var(--radius-control)] border border-line bg-base px-2.5 py-1 text-[0.7rem] font-medium text-fg">
                Price &gt; High
              </span>
              <span className="mr-3 h-3 w-px bg-line-strong" />
              <span className="rounded-[var(--radius-control)] border border-line bg-base px-2.5 py-1 text-[0.7rem] font-medium text-accent">
                Execute long
              </span>
            </div>
          </CellShell>

          <CellShell
            icon={Broadcast}
            title="Transparent agent feed"
            body="Every scan, signal and order is narrated in plain language, so you always know what the bot is doing and why."
          >
            <FeedVisual />
          </CellShell>

          <CellShell
            icon={Notebook}
            title="Journal and analytics"
            body="Each execution is logged and analysed automatically, turning your history into a record you can actually learn from."
          >
            <div
              aria-hidden
              className="grid-faint pointer-events-none absolute inset-0 opacity-[0.15] [mask-image:radial-gradient(70%_60%_at_80%_20%,black,transparent)]"
            />
          </CellShell>
        </motion.div>
      </div>
    </section>
  );
}
