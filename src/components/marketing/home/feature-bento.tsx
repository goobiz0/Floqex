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
import { RemotionPlayer } from "../remotion/remotion-provider";
import { FeatureExecution } from "../remotion/feature-execution";
import { FeatureRisk } from "../remotion/feature-risk";
import { FeatureStrategy } from "../remotion/feature-strategy";
import { FeatureFeed } from "../remotion/feature-feed";
import { FeatureJournal } from "../remotion/feature-journal";

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
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated transition-colors duration-300 hover:border-line-strong",
        className
      )}
    >
      <div className="relative h-64 w-full overflow-hidden border-b border-line bg-base">
        {children}
      </div>
      <div className="flex flex-col p-7">
        <span className="relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
          <IconCmp size={22} weight="fill" />
        </span>
        <h3 className="relative z-10 text-xl font-semibold tracking-tight text-fg">
          {title}
        </h3>
        <p className="relative z-10 mt-2 max-w-sm text-[0.95rem] leading-relaxed text-fg-muted">
          {body}
        </p>
      </div>
    </div>
  );
}

export function FeatureBento() {
  const reduce = useReducedMotion();

  const playerProps = {
    durationInFrames: 180,
    fps: 30,
    compositionWidth: 380,
    compositionHeight: 240,
    className: "h-full w-full border-none rounded-none",
  };

  return (
    <section id="features" className="relative border-y border-line bg-base py-24 md:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg md:text-4xl">
            One engine for the whole loop.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Build, test, execute and review without stitching together five
            tools. The hard infrastructure is handled so you can focus on the edge.
          </p>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {/* Top row: 2 + 1 */}
          <CellShell
            icon={Lightning}
            title="Broker-level execution"
            body="Orders fire in milliseconds, directly at your broker, so what you backtest is close to what you fill."
            className="md:col-span-2"
          >
            <RemotionPlayer component={FeatureExecution} {...playerProps} compositionWidth={780} />
          </CellShell>

          <CellShell
            icon={ShieldCheck}
            title="Risk limits that hold"
            body="Set a daily drawdown cap and max position size. The engine enforces them and stands the bot down when a limit is hit."
          >
            <RemotionPlayer component={FeatureRisk} {...playerProps} />
          </CellShell>

          {/* Bottom row: 1 + 1 + 1 */}
          <CellShell
            icon={TreeStructure}
            title="Visual strategy builder"
            body="Compose conditions as connected blocks and tune them in place. Read the logic at a glance."
          >
            <RemotionPlayer component={FeatureStrategy} {...playerProps} />
          </CellShell>

          <CellShell
            icon={Broadcast}
            title="Transparent agent feed"
            body="Every scan, signal and order is narrated in plain language, so you always know what the bot is doing and why."
          >
            <RemotionPlayer component={FeatureFeed} {...playerProps} />
          </CellShell>

          <CellShell
            icon={Notebook}
            title="Journal and analytics"
            body="Each execution is logged and analysed automatically, turning your history into a record you can actually learn from."
          >
            <RemotionPlayer component={FeatureJournal} {...playerProps} />
          </CellShell>
        </motion.div>
      </div>
    </section>
  );
}
