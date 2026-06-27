"use client";

import { motion } from "motion/react";
import { DocsRemotionPlayer } from "@/components/docs/remotion-player";
import { RiskAnimation } from "@/remotion/risk-animation";
import { ShieldCheck, StopCircle, LockKey, TrendDown } from "@phosphor-icons/react/dist/ssr";

export default function RiskPage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Risk Management
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Floqex is built on the premise that capital preservation supersedes profit generation. Every bot is constrained by server-side limits that cannot be overridden by tilt.
        </p>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Render Remotion Component inline for demonstration */}
        <DocsRemotionPlayer 
          component={RiskAnimation} 
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
        <h2 className="text-2xl font-semibold text-fg">Inviolable Guardrails</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
              <StopCircle size={20} weight="fill" />
            </div>
            <h3 className="font-semibold text-fg mb-2">Daily Loss Circuit Breaker</h3>
            <p className="text-sm text-fg-subtle leading-relaxed mb-4">
              You configure a maximum daily loss percentage (between 1% and 5%). If the total realized plus unrealized P&L for the day crosses this threshold, Floqex immediately flattens all open positions and halts trading until the next calendar day.
            </p>
            <div className="bg-elevated p-3 rounded-md border border-line text-xs font-mono text-fg-muted">
              ceiling_cap = min(user_defined_cap, 5.0)
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
              <ShieldCheck size={20} weight="fill" />
            </div>
            <h3 className="font-semibold text-fg mb-2">Per-Trade Sizing</h3>
            <p className="text-sm text-fg-subtle leading-relaxed mb-4">
              Floqex automatically calculates position sizes based on the distance between the entry price and the stop loss. You define the risk per trade (e.g., 0.5% to 1%). The engine guarantees that if the stop loss is hit, the loss exactly matches your configured risk percentage.
            </p>
            <div className="bg-elevated p-3 rounded-md border border-line text-xs font-mono text-fg-muted">
              qty = (account_balance * risk_pct) / (entry - stop)
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
              <LockKey size={20} weight="fill" />
            </div>
            <h3 className="font-semibold text-fg mb-2">Trade Frequency Caps</h3>
            <p className="text-sm text-fg-subtle leading-relaxed">
              To prevent overtrading in choppy environments, bots are bound by strict caps on trade volume: a maximum number of trades per session (e.g., 4) and per day (e.g., 8). Additionally, the engine enforces a maximum number of concurrent open trades across the account.
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
              <TrendDown size={20} weight="fill" />
            </div>
            <h3 className="font-semibold text-fg mb-2">Instrument Benching</h3>
            <p className="text-sm text-fg-subtle leading-relaxed">
              If an instrument (e.g., NQ) yields 4 consecutive losses in a single day, the engine benches that instrument for the remainder of the session, interpreting the price action as incompatible with the breakout logic.
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
        <h2 className="text-2xl font-semibold text-fg">Emergency Stop</h2>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <p className="text-sm text-fg-muted leading-relaxed">
            Visible on every screen within the dashboard is the <strong>Emergency Stop</strong> button. Engaging this button issues a kill-command to the engine: all bots are immediately halted, all open positions are flattened via market orders, and all pending orders are canceled. The bot status is set to `STOPPED` and cannot resume without explicit user reactivation.
          </p>
        </div>
      </motion.section>

    </div>
  );
}
