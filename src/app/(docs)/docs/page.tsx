"use client";

import { RocketLaunch, ShieldCheck, Cpu, ChartLineUp, Key, Bank, Info, Clock, CheckCircle, Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { motion } from "motion/react";

export default function DocsPage() {
  return (
    <div className="space-y-12">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <RocketLaunch size={14} weight="bold" />
          Welcome to Floqex
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-fg">
          The Autonomous Trading Engine
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Floqex is an institutional-grade, zero-emotion execution platform. We specialize exclusively in the Opening Range Breakout (ORB) strategy.
        </p>
      </motion.header>

      {/* Core Philosophy */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-3">Why Algorithmic Execution?</h2>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="flex items-center gap-3 mb-4 text-negative">
              <Warning size={24} weight="duotone" />
              <h3 className="font-semibold text-fg">The Human Problem</h3>
            </div>
            <ul className="space-y-3 text-sm text-fg-subtle">
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-negative mt-1.5 shrink-0"/> Fear causes early exits from winning trades.</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-negative mt-1.5 shrink-0"/> Greed causes ignored take-profit targets.</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-negative mt-1.5 shrink-0"/> Hope causes blown accounts on losing trades.</li>
            </ul>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Cpu size={120} />
            </div>
            <div className="flex items-center gap-3 mb-4 text-positive">
              <CheckCircle size={24} weight="duotone" />
              <h3 className="font-semibold text-fg">The Floqex Solution</h3>
            </div>
            <ul className="space-y-3 text-sm text-fg-subtle relative z-10">
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-positive mt-1.5 shrink-0"/> Instant execution on valid signals.</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-positive mt-1.5 shrink-0"/> Unemotional stop-loss enforcement.</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-positive mt-1.5 shrink-0"/> Precision scale-outs and trailing stops.</li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Quick Start Cards */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-3">Platform Navigation</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          
          <Link href="/docs/strategy" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-all hover:border-accent hover:shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <ChartLineUp size={20} weight="duotone" />
            </div>
            <h3 className="text-base font-semibold text-fg">The ORB Strategy</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Understand how we define the Opening Range, confirm breakouts, and avoid fakeouts.
            </p>
          </Link>

          <Link href="/docs/risk" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-all hover:border-accent hover:shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} weight="duotone" />
            </div>
            <h3 className="text-base font-semibold text-fg">Risk Management</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Discover our circuit breakers, daily drawdown limits, and automatic stop-loss mechanics.
            </p>
          </Link>

          <Link href="/docs/brokers" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-all hover:border-accent hover:shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <Bank size={20} weight="duotone" />
            </div>
            <h3 className="text-base font-semibold text-fg">Broker Integration</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Learn how to securely connect your Alpaca or TradeStation API keys for live execution.
            </p>
          </Link>

        </div>
      </motion.section>

      {/* Architecture Deep Dive */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-3">System Architecture</h2>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-start relative">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-accent/10 text-accent flex items-center justify-center relative z-10">
                <Clock size={24} weight="duotone" />
              </div>
              <div className="absolute left-6 top-12 bottom-[-2rem] w-px bg-line hidden md:block" />
              <div>
                <h3 className="text-lg font-semibold text-fg">1. Market Schedule Synchronization</h3>
                <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
                  The engine wakes up pre-market, checks broker balances, and validates API keys. At 9:30 AM EST, the ORB formation period begins exactly on the bell.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start relative">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-accent/10 text-accent flex items-center justify-center relative z-10">
                <Cpu size={24} weight="duotone" />
              </div>
              <div className="absolute left-6 top-12 bottom-[-2rem] w-px bg-line hidden md:block" />
              <div>
                <h3 className="text-lg font-semibold text-fg">2. Data Ingestion & Pricing</h3>
                <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
                  Our servers ingest institutional-grade Level 1 consolidated market data (SIP) in real-time via WebSockets, ensuring low-latency breakout detection.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start relative">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-accent text-[var(--color-on-accent)] flex items-center justify-center relative z-10 shadow-lg shadow-accent/20">
                <Key size={24} weight="fill" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-fg">3. The Execution Layer</h3>
                <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
                  When a strategy signal triggers, the Execution Engine decrypts your API keys in memory, formats a FIX/REST payload, and submits an OCO (One-Cancels-Other) bracket order to your broker instantly.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-base/50 p-4 border-t border-line text-sm flex items-center justify-center gap-2 text-fg-muted">
            <Info size={16} /> Floqex infrastructure runs on globally distributed edge networks to ensure 99.99% uptime.
          </div>
        </div>
      </motion.section>

    </div>
  );
}
