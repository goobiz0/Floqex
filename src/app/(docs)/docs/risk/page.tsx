"use client";

import { useState } from "react";
import { ShieldCheck, WarningCircle, Calculator, Info } from "@phosphor-icons/react";

export default function RiskPage() {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [winRate, setWinRate] = useState(55);
  const [rrRatio, setRrRatio] = useState(2);

  const riskDollar = accountSize * (riskPercent / 100);
  const expectancy = (winRate / 100) * (riskDollar * rrRatio) - ((100 - winRate) / 100) * riskDollar;
  
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <ShieldCheck size={14} weight="bold" />
          Defense First
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Risk Management</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          The most important aspect of trading is not the entry, but the risk. Floqex enforces ironclad guardrails that prevent emotional blow-ups and protect your capital.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">The Circuit Breaker</h2>
        <div className="flex gap-4 p-4 rounded-xl border border-negative/30 bg-negative-soft text-negative">
          <WarningCircle size={24} className="shrink-0 mt-1" />
          <div className="space-y-2">
            <h3 className="font-bold">Max Daily Drawdown (MDD)</h3>
            <p className="text-sm leading-relaxed">
              If your account loses a specified percentage in a single day (default 3%), the bot will automatically <strong>HARD STOP</strong>. It cancels all pending orders and will refuse to take any more trades until the next session. This is the ultimate defense against market chops and revenge trading.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Calculator */}
      <section className="space-y-6 mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="p-2 bg-accent-soft rounded-lg text-accent">
            <Calculator size={24} />
          </div>
          <h2 className="text-xl font-semibold text-fg">Expectancy & Risk Calculator</h2>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-fg flex justify-between">
                <span>Account Size</span>
                <span className="font-mono text-accent">${accountSize.toLocaleString()}</span>
              </label>
              <input type="range" min="1000" max="100000" step="1000" value={accountSize} onChange={e => setAccountSize(Number(e.target.value))} className="w-full mt-2 accent-accent" />
            </div>

            <div>
              <label className="text-sm font-medium text-fg flex justify-between">
                <span>Risk Per Trade (%)</span>
                <span className="font-mono text-negative">{riskPercent}%</span>
              </label>
              <input type="range" min="0.25" max="5" step="0.25" value={riskPercent} onChange={e => setRiskPercent(Number(e.target.value))} className="w-full mt-2 accent-accent" />
            </div>

            <div>
              <label className="text-sm font-medium text-fg flex justify-between">
                <span>Win Rate (%)</span>
                <span className="font-mono text-fg">{winRate}%</span>
              </label>
              <input type="range" min="30" max="80" step="1" value={winRate} onChange={e => setWinRate(Number(e.target.value))} className="w-full mt-2 accent-accent" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-fg flex justify-between">
                <span>Reward:Risk Ratio</span>
                <span className="font-mono text-profit">{rrRatio}:1</span>
              </label>
              <input type="range" min="1" max="5" step="0.5" value={rrRatio} onChange={e => setRrRatio(Number(e.target.value))} className="w-full mt-2 accent-accent" />
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <div className="bg-base border border-line rounded-lg p-4">
              <p className="text-sm text-fg-subtle">Dollar Risk Per Trade</p>
              <p className="text-2xl font-mono font-bold text-negative mt-1">${riskDollar.toFixed(2)}</p>
            </div>
            <div className="bg-base border border-line rounded-lg p-4">
              <p className="text-sm text-fg-subtle">Reward Per Win</p>
              <p className="text-2xl font-mono font-bold text-profit mt-1">${(riskDollar * rrRatio).toFixed(2)}</p>
            </div>
            <div className={`border rounded-lg p-4 ${expectancy > 0 ? 'bg-positive-soft border-positive/30' : 'bg-negative-soft border-negative/30'}`}>
              <div className="flex items-center gap-2 text-sm text-fg-subtle">
                Expected Value (Per Trade) 
                <div className="group relative">
                  <Info size={14} className="text-fg-muted" />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-fg text-base-pure text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-10">
                    Average expected profit per trade over a large sample size.
                  </div>
                </div>
              </div>
              <p className={`text-3xl font-mono font-bold mt-1 ${expectancy > 0 ? 'text-positive' : 'text-negative'}`}>
                {expectancy > 0 ? '+' : ''}${expectancy.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Position Sizing Mathematics</h2>
        <div className="grid gap-4 mt-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-fg">Dynamic Share Sizing</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              You define the exact percentage you are willing to lose. The bot calculates the position size dynamically based on the distance from the entry price to the stop loss.
            </p>
            <div className="mt-4 p-3 bg-base rounded-md border border-line font-mono text-xs text-fg-muted overflow-x-auto">
              Shares = (Account * Risk%) / (Entry - Stop)
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-fg">Automatic Stop Losses</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Every order sent to the broker includes a hard stop loss. If the broker API disconnects or your internet goes down, your stop is already resting on their exchange servers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
