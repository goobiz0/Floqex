"use client";

import { RocketLaunch, ShieldCheck, Cpu, ChartLineUp, Key, Bank, Info, Clock, CheckCircle, Warning, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { motion } from "motion/react";

export default function DocsPage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg text-balance">
          Automated algorithmic execution, within hard risk boundaries.
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Floqex is a zero-emotion algorithmic trading platform. You connect your broker, configure your risk bounds, and Floqex trades autonomously based on the Opening Range Breakout (ORB) strategy.
        </p>
        
        <div className="pt-4 flex items-center gap-4">
          <Link href="/docs/dashboard" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent text-[var(--color-on-accent)] px-4 py-2 text-sm font-medium transition-transform active:scale-[0.97]">
            Dashboard Guide
            <ArrowRight size={16} weight="bold" />
          </Link>
          <Link href="/docs/strategy" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-surface border border-line px-4 py-2 text-sm font-medium transition-transform hover:border-accent active:scale-[0.97]">
            Explore the Strategy
          </Link>
        </div>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8 border-t border-line pt-12"
      >
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-fg">Why algorithmic execution?</h2>
          <p className="mt-2 text-fg-muted leading-relaxed">
            Human discretionary trading is fundamentally flawed by psychology. Floqex solves the behavioral gap between a proven edge and a profitable execution.
          </p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 relative overflow-hidden">
            <h3 className="font-medium text-fg mb-4">The Discretionary Gap</h3>
            <ul className="space-y-4 text-sm text-fg-subtle">
              <li className="flex gap-3 items-start"><Warning size={16} className="text-negative mt-0.5 shrink-0" /> Fear of loss forces early exits from winning trades.</li>
              <li className="flex gap-3 items-start"><Warning size={16} className="text-negative mt-0.5 shrink-0" /> Greed causes missed take-profit targets, turning winners into losers.</li>
              <li className="flex gap-3 items-start"><Warning size={16} className="text-negative mt-0.5 shrink-0" /> Emotional spirals cause traders to ignore their own daily loss limits.</li>
            </ul>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 relative overflow-hidden">
            <h3 className="font-medium text-fg mb-4">The Floqex Contract</h3>
            <ul className="space-y-4 text-sm text-fg-subtle">
              <li className="flex gap-3 items-start"><CheckCircle size={16} className="text-profit mt-0.5 shrink-0" /> Instant execution the millisecond a valid signal prints.</li>
              <li className="flex gap-3 items-start"><CheckCircle size={16} className="text-profit mt-0.5 shrink-0" /> Mechanical stop-loss and take-profit enforcement.</li>
              <li className="flex gap-3 items-start"><CheckCircle size={16} className="text-profit mt-0.5 shrink-0" /> Server-side daily loss circuit breakers that cannot be overridden by tilt.</li>
            </ul>
          </div>
        </div>
      </motion.section>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8 border-t border-line pt-12"
      >
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-fg">Core documentation</h2>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/docs/strategy" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-colors hover:border-accent">
            <ChartLineUp size={24} className="text-accent mb-4" />
            <h3 className="text-base font-semibold text-fg">The ORB Strategy</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Understand our quantitative approach to the Opening Range Breakout.
            </p>
          </Link>

          <Link href="/docs/risk" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-colors hover:border-accent">
            <ShieldCheck size={24} className="text-accent mb-4" />
            <h3 className="text-base font-semibold text-fg">Risk Management</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Circuit breakers, position sizing, and our inviolable daily loss caps.
            </p>
          </Link>

          <Link href="/docs/brokers" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-colors hover:border-accent">
            <Bank size={24} className="text-accent mb-4" />
            <h3 className="text-base font-semibold text-fg">Broker Integration</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Securely connect to Alpaca, TradeStation, and OANDA for live execution.
            </p>
          </Link>
        </div>
      </motion.section>

    </div>
  );
}
