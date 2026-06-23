"use client";

import { ShieldCheck, WarningCircle } from "@phosphor-icons/react";

export default function RiskPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Risk Management</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          The most important aspect of trading is not the entry, but the risk. Floqex enforces ironclad guardrails that prevent emotional blow-ups.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">The Circuit Breaker</h2>
        <div className="flex gap-4 p-4 rounded-xl border border-negative/30 bg-negative-soft text-negative">
          <WarningCircle size={24} className="shrink-0" />
          <p className="text-sm">
            <strong>Max Daily Drawdown:</strong> If your account loses a specified amount in a single day, the bot will automatically <strong>STOP</strong> and will refuse to take any more trades until the next session. This is the ultimate defense against market chops and revenge trading.
          </p>
        </div>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Position Sizing</h2>
        <div className="grid gap-4 mt-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-fg">Fixed Risk per Trade</h3>
            <p className="mt-2 text-sm text-fg-subtle">
              You define the exact dollar amount you are willing to lose on a single trade. The bot calculates the position size dynamically based on the distance to the stop loss.
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-fg">Automatic Stop Losses</h3>
            <p className="mt-2 text-sm text-fg-subtle">
              Every order sent to the broker includes a hard stop loss. If the broker API disconnects, your stop is already resting on their servers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
