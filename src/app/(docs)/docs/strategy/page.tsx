"use client";

import { motion } from "motion/react";
import { DocsRemotionPlayer } from "@/components/docs/remotion-player";
import { OrbAnimation } from "@/remotion/orb-animation";
import { ChartLineUp, Lightning, TrendUp, BookOpen, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export default function StrategyPage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          The ORB Strategy
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Floqex executes a strict Opening Range Breakout (ORB) strategy. This page details the quantitative rules that govern every entry, exit, and news blackout.
        </p>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Render Remotion Component inline for demonstration */}
        <DocsRemotionPlayer 
          component={OrbAnimation} 
          compositionWidth={800} 
          compositionHeight={400} 
          durationInFrames={300} 
        />
      </motion.section>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <h2 className="text-2xl font-semibold text-fg">Anatomy of the Trade</h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-medium text-accent flex items-center gap-2"><ChartLineUp size={20} /> 1. The Opening Range</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              The engine marks the highest high and the lowest low of the first 15 minutes of the session (e.g., 09:30 - 09:45 EST for NY). This establishes the &quot;range&quot;.
              If this range is extremely tight or unusually massive (outside of a 0.3x to 3x multiplier of the historical typical range), the bot will skip trading that instrument for the session to avoid chop or outlier volatility.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-accent flex items-center gap-2"><Lightning size={20} /> 2. The Breakout (Entry)</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              A trade triggers when a 1-minute candle closes outside the bounds of the Opening Range.
              <br/><br/>
              - <strong>Long Entry:</strong> 1-min close above the OR High.<br/>
              - <strong>Short Entry:</strong> 1-min close below the OR Low.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-accent flex items-center gap-2"><ShieldCheck size={20} /> 3. Risk and Target</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Instantly upon entry, Floqex submits an OCO (One-Cancels-Other) bracket order to the broker.
              <br/><br/>
              - <strong>Stop Loss:</strong> Placed at the opposite side of the Opening Range.<br/>
              - <strong>Take Profit:</strong> Defaults to a 2R (Reward-to-Risk) target.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-accent flex items-center gap-2"><BookOpen size={20} /> 4. The Evidence Loop</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Over time, Floqex tracks the performance of the ORB strategy across different timeframes, volatility buckets, and market regimes. The engine can propose small optimizations (like tweaking the range health filter) based on statistically significant historical evidence.
            </p>
          </div>
        </div>
      </motion.section>
      
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6 border-t border-line pt-12"
      >
        <h2 className="text-2xl font-semibold text-fg">News Blackouts</h2>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <p className="text-sm text-fg-muted leading-relaxed mb-4">
            Floqex integrates with ForexFactory&apos;s weekly calendar to ingest high-impact economic data releases (e.g., CPI, FOMC, NFP).
          </p>
          <ul className="space-y-2 text-sm text-fg-subtle">
            <li><span className="text-fg font-medium">Pre-news filter:</span> No new entries are allowed 15 minutes prior to and 15 minutes after a high-impact USD news event.</li>
            <li><span className="text-fg font-medium">Top-tier flatten:</span> For tier-1 events (CPI, Fed Funds Rate), Floqex will actively flatten any open positions 5 minutes before the release to avoid slippage.</li>
          </ul>
        </div>
      </motion.section>

    </div>
  );
}
