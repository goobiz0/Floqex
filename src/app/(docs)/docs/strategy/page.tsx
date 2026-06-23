"use client";

import { useState } from "react";
import { Info, Target, Strategy, ShieldCheck, Crosshair, TrendUp } from "@phosphor-icons/react";

export default function StrategyPage() {
  const [range, setRange] = useState(15);
  const [takeProfit, setTakeProfit] = useState(2.5);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <Strategy size={14} weight="bold" />
          The Algorithm
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Opening Range Breakout (ORB)</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          The Opening Range Breakout (ORB) strategy is the core mathematical edge that Floqex is built upon. It exploits the massive institutional liquidity and price discovery that occurs during the first hour of the New York trading session.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Mechanical Rules of Engagement</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="bg-surface border border-line p-5 rounded-[var(--radius-card)] shadow-sm space-y-3">
            <div className="h-10 w-10 bg-accent/10 text-accent rounded flex items-center justify-center">
              <Crosshair size={24} />
            </div>
            <h3 className="font-semibold text-fg text-lg">1. Identify the Range</h3>
            <p className="text-sm text-fg-subtle">
              The algorithm records the absolute High and absolute Low of the asset during the specified Opening Range (e.g., the first 15 minutes of trading from 9:30 AM to 9:45 AM EST). This establishes the immediate support and resistance.
            </p>
          </div>
          <div className="bg-surface border border-line p-5 rounded-[var(--radius-card)] shadow-sm space-y-3">
            <div className="h-10 w-10 bg-profit/10 text-profit rounded flex items-center justify-center">
              <TrendUp size={24} />
            </div>
            <h3 className="font-semibold text-fg text-lg">2. Confirm the Breakout</h3>
            <p className="text-sm text-fg-subtle">
              When the price closes outside of the established range, the bot checks relative volume (RVOL). If RVOL exceeds 1.5x the 20-period average, the breakout is considered valid and the bot executes a market order.
            </p>
          </div>
          <div className="bg-surface border border-line p-5 rounded-[var(--radius-card)] shadow-sm space-y-3">
            <div className="h-10 w-10 bg-negative/10 text-negative rounded flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-semibold text-fg text-lg">3. Risk & Reward</h3>
            <p className="text-sm text-fg-subtle">
              Simultaneous to the entry, an OCO (One-Cancels-Other) bracket is placed. The Stop Loss is set below the breakout candle's low, and the Take Profit is set at exactly 2x (or user-defined) the risk amount.
            </p>
          </div>
        </div>
      </section>

      {/* Volatility Environments Table */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Optimal Range Durations</h2>
        <p className="text-fg-subtle leading-relaxed mb-4">
          Different volatility regimes require different range lengths. Use the table below to understand when the algorithm adjusts its time horizons.
        </p>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
          <table className="w-full text-sm text-left">
            <thead className="bg-base border-b border-line text-fg font-semibold">
              <tr>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Best Environment</th>
                <th className="px-4 py-3">Win Rate (Avg)</th>
                <th className="px-4 py-3">Drawdown Risk</th>
              </tr>
            </thead>
            <tbody className="text-fg-subtle divide-y divide-line">
              <tr className="hover:bg-line/20 transition-colors">
                <td className="px-4 py-3 font-mono text-fg">5 Minutes</td>
                <td className="px-4 py-3">High Volatility (VIX &gt; 25)</td>
                <td className="px-4 py-3 text-negative">42% (Lower)</td>
                <td className="px-4 py-3 text-negative">High (Prone to Fakeouts)</td>
              </tr>
              <tr className="hover:bg-line/20 transition-colors">
                <td className="px-4 py-3 font-mono text-accent font-semibold">15 Minutes</td>
                <td className="px-4 py-3">Normal Markets (Sweet Spot)</td>
                <td className="px-4 py-3 text-profit">58%</td>
                <td className="px-4 py-3 text-warning">Medium</td>
              </tr>
              <tr className="hover:bg-line/20 transition-colors">
                <td className="px-4 py-3 font-mono text-fg">30 Minutes</td>
                <td className="px-4 py-3">Low Volatility / Chop</td>
                <td className="px-4 py-3 text-profit">65% (Higher)</td>
                <td className="px-4 py-3 text-positive">Low</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive Interactive Component */}
      <section className="space-y-6 mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="p-2 bg-accent-soft rounded-lg text-accent">
            <Target size={24} />
          </div>
          <h2 className="text-xl font-semibold text-fg">Interactive Risk Visualizer</h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-fg">Opening Range Duration</label>
              <div className="mt-2 flex gap-2">
                {[5, 15, 30].map(val => (
                  <button
                    key={val}
                    onClick={() => setRange(val)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${range === val ? 'bg-accent text-white' : 'bg-base text-fg-muted hover:bg-line'}`}
                  >
                    {val} min
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-fg-subtle">
                A {range} minute range {range === 5 ? "is highly aggressive but prone to whipsaws." : range === 30 ? "is conservative with fewer, higher quality setups." : "is the mathematical sweet spot for SPY/QQQ."}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-fg">Take Profit Multiplier</label>
              <input 
                type="range" 
                min="1" max="5" step="0.5" 
                value={takeProfit} 
                onChange={e => setTakeProfit(Number(e.target.value))}
                className="w-full mt-2 accent-accent"
              />
              <div className="flex justify-between text-xs font-mono text-fg-muted mt-1">
                <span>1x</span>
                <span className="text-accent font-bold">{takeProfit}x Risk</span>
                <span>5x</span>
              </div>
            </div>
          </div>

          <div className="relative rounded-xl border border-line bg-base p-4 overflow-hidden h-[200px] flex items-center justify-center">
            {/* Very simple visual abstraction of ORB */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-16 border-y-2 border-dashed border-fg-muted/50 bg-accent-soft/20" />
            <div className="absolute left-10 top-2 bottom-2 w-[2px] bg-line-strong" />
            
            {/* Price line */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <path 
                d="M 32 120 Q 60 140, 80 100 T 120 110 T 150 90 L 180 40 L 250 20" 
                fill="none" 
                stroke="var(--color-accent)" 
                strokeWidth="3" 
                strokeLinecap="round" 
              />
            </svg>

            {/* Annotations */}
            <div className="absolute top-8 left-1/2 text-[10px] font-bold text-profit px-2 py-1 bg-profit/10 rounded border border-profit/30">
              Entry Target
            </div>
            <div className="absolute top-[20%] right-[10%] text-[10px] font-bold text-profit px-2 py-1 bg-profit/20 border border-profit rounded shadow-[0_0_10px_rgba(var(--color-profit),0.3)] transition-all" style={{ transform: `translateY(${Math.max(-20, 20 - (takeProfit * 10))}px)` }}>
              TP (+{takeProfit}R)
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Time Decay Rules</h2>
        <p className="text-fg-subtle leading-relaxed">
          The best setups occur when the market has maximum liquidity and momentum. This is why Floqex utilizes strict <strong>Time Decay Guards</strong>. By default, the bot stops looking for new entries after 11:00 AM EST. Volume naturally drops during the midday lunch hour, leading to choppy, mean-reverting price action which is mathematically hostile to breakout strategies.
        </p>
      </section>
    </div>
  );
}
