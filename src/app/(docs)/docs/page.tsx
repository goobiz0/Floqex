export const metadata = {
  title: "Documentation | Floqex",
  description: "Official documentation for the Floqex algorithmic trading platform.",
};

import { RocketLaunch, ShieldCheck, Cpu, ChartLineUp, Key, Bank } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <RocketLaunch size={14} weight="bold" />
          Welcome to Floqex
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-fg">
          The Autonomous Trading Engine
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Floqex is a proprietary algorithmic trading platform that executes the Opening Range Breakout (ORB) strategy with zero emotion. This documentation will guide you through our system architecture, strategy logic, and strict risk guardrails.
        </p>
      </header>

      {/* Core Philosophy */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-3">Why Algorithmic Execution?</h2>
        <div className="prose prose-invert prose-emerald max-w-none text-fg-subtle">
          <p className="leading-relaxed">
            The vast majority of discretionary day traders fail not because their strategy lacks an edge, but because human psychology is incompatible with the strict discipline required to realize that edge. <strong>Fear</strong> causes early exits from winning trades. <strong>Greed</strong> causes traders to ignore their take-profit targets. <strong>Hope</strong> causes traders to hold onto losers until their account blows up.
          </p>
          <p className="leading-relaxed mt-4">
            By completely abstracting the execution layer to a cloud-based trading bot, Floqex ensures that the ORB strategy is traded exactly as backtested. If a setup occurs, the trade is taken. If the stop is hit, the trade is closed instantly. No hesitation.
          </p>
        </div>
      </section>

      {/* Quick Start Cards */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-3">Platform Navigation</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          
          <Link href="/docs/strategy" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-all hover:border-accent hover:shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <ChartLineUp size={20} weight="bold" />
            </div>
            <h3 className="text-base font-semibold text-fg">The ORB Strategy</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Understand how we define the Opening Range, confirm breakouts, and avoid fakeouts.
            </p>
          </Link>

          <Link href="/docs/risk" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-all hover:border-accent hover:shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} weight="bold" />
            </div>
            <h3 className="text-base font-semibold text-fg">Risk Management</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Discover our circuit breakers, daily drawdown limits, and automatic stop-loss mechanics.
            </p>
          </Link>

          <Link href="/docs/brokers" className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-all hover:border-accent hover:shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <Bank size={20} weight="bold" />
            </div>
            <h3 className="text-base font-semibold text-fg">Broker Integration</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Learn how to securely connect your Alpaca or TradeStation API keys for live execution.
            </p>
          </Link>

        </div>
      </section>

      {/* Architecture Deep Dive */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-3">System Architecture</h2>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-accent text-[var(--color-on-accent)] flex items-center justify-center">
                <Cpu size={24} weight="fill" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-fg">1. Data Ingestion & Pricing</h3>
                <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
                  Our servers ingest institutional-grade Level 1 consolidated market data (SIP) in real-time. This ensures that the engine is reacting to accurate, low-latency price updates.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-accent text-[var(--color-on-accent)] flex items-center justify-center">
                <Key size={24} weight="fill" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-fg">2. The Execution Layer</h3>
                <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
                  When a strategy signal triggers, the Execution Engine decrypts your API keys in memory (they are never stored in plaintext), formats a FIX/REST payload, and submits an OCO (One-Cancels-Other) bracket order to your broker instantly.
                </p>
              </div>
            </div>

          </div>
          <div className="bg-base/50 p-4 border-t border-line text-sm text-center text-fg-muted">
            Floqex infrastructure runs on globally distributed edge networks to ensure 99.99% uptime.
          </div>
        </div>
      </section>

    </div>
  );
}
