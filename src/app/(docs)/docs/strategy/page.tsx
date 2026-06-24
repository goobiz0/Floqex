"use client";

import { useState } from "react";
import { Info, Target, Strategy, ShieldCheck, Crosshair, TrendUp, Clock, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";

export default function StrategyPage() {
  const [range, setRange] = useState(15);
  const [takeProfit, setTakeProfit] = useState(2.5);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
      <motion.header variants={itemVariants} className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <Strategy size={14} weight="duotone" />
          The Algorithm
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-fg">Opening Range Breakout (ORB)</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed max-w-2xl">
          The Opening Range Breakout (ORB) strategy is the core mathematical edge that Floqex is built upon. It exploits the massive institutional liquidity and price discovery that occurs during the first hour of the New York trading session.
        </p>
      </motion.header>

      <motion.section variants={itemVariants} className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Mechanical Rules of Engagement</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="bg-surface border border-line p-5 rounded-[var(--radius-card)] shadow-sm space-y-3 hover:border-accent/50 transition-colors">
            <div className="h-12 w-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-5">
              <Crosshair size={28} weight="duotone" />
            </div>
            <h3 className="font-semibold text-fg text-lg">1. Identify the Range</h3>
            <p className="text-sm text-fg-subtle leading-relaxed">
              The algorithm records the absolute High and absolute Low of the asset during the specified Opening Range (e.g., the first 15 minutes of trading from 9:30 AM to 9:45 AM EST). This establishes the immediate support and resistance.
            </p>
          </div>
          <div className="bg-surface border border-line p-5 rounded-[var(--radius-card)] shadow-sm space-y-3 hover:border-profit/50 transition-colors">
            <div className="h-12 w-12 bg-profit/10 text-profit rounded-xl flex items-center justify-center mb-5">
              <TrendUp size={28} weight="duotone" />
            </div>
            <h3 className="font-semibold text-fg text-lg">2. Confirm the Breakout</h3>
            <p className="text-sm text-fg-subtle leading-relaxed">
              When the price closes outside of the established range, the bot checks relative volume (RVOL). If RVOL exceeds 1.5x the 20-period average, the breakout is considered valid and the bot executes a market order.
            </p>
          </div>
          <div className="bg-surface border border-line p-5 rounded-[var(--radius-card)] shadow-sm space-y-3 hover:border-negative/50 transition-colors">
            <div className="h-12 w-12 bg-negative/10 text-negative rounded-xl flex items-center justify-center mb-5">
              <ShieldCheck size={28} weight="duotone" />
            </div>
            <h3 className="font-semibold text-fg text-lg">3. Risk & Reward</h3>
            <p className="text-sm text-fg-subtle leading-relaxed">
              Simultaneous to the entry, an OCO (One-Cancels-Other) bracket is placed. The Stop Loss is set below the breakout candle's low, and the Take Profit is set at exactly 2x (or user-defined) the risk amount.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Volatility Environments Table */}
      <motion.section variants={itemVariants} className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Optimal Range Durations</h2>
        <p className="text-fg-subtle leading-relaxed mb-4">
          Different volatility regimes require different range lengths. Use the table below to understand when the algorithm adjusts its time horizons.
        </p>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
          <table className="w-full text-sm text-left">
            <thead className="bg-base border-b border-line text-fg font-semibold">
              <tr>
                <th className="px-5 py-4">Duration</th>
                <th className="px-5 py-4">Best Environment</th>
                <th className="px-5 py-4">Win Rate (Avg)</th>
                <th className="px-5 py-4">Drawdown Risk</th>
              </tr>
            </thead>
            <tbody className="text-fg-subtle divide-y divide-line">
              <tr className="hover:bg-line/20 transition-colors">
                <td className="px-5 py-4 font-mono text-fg">5 Minutes</td>
                <td className="px-5 py-4">High Volatility (VIX &gt; 25)</td>
                <td className="px-5 py-4 text-negative">42% (Lower)</td>
                <td className="px-5 py-4 text-negative">High (Prone to Fakeouts)</td>
              </tr>
              <tr className="bg-accent/5 hover:bg-accent/10 transition-colors">
                <td className="px-5 py-4 font-mono text-accent font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  15 Minutes
                </td>
                <td className="px-5 py-4 text-fg font-medium">Normal Markets (Sweet Spot)</td>
                <td className="px-5 py-4 text-profit font-medium">58%</td>
                <td className="px-5 py-4 text-warning font-medium">Medium</td>
              </tr>
              <tr className="hover:bg-line/20 transition-colors">
                <td className="px-5 py-4 font-mono text-fg">30 Minutes</td>
                <td className="px-5 py-4">Low Volatility / Chop</td>
                <td className="px-5 py-4 text-profit">65% (Higher)</td>
                <td className="px-5 py-4 text-positive">Low</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* Interactive Component */}
      <motion.section variants={itemVariants} className="space-y-6 mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <Target size={200} weight="fill" />
        </div>
        <div className="flex items-center gap-3 border-b border-line pb-4 relative z-10">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <Target size={24} weight="duotone" />
          </div>
          <h2 className="text-xl font-semibold text-fg">Interactive Risk Visualizer</h2>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 relative z-10 pt-4">
          <div className="space-y-8">
            <div>
              <label className="text-sm font-medium text-fg block mb-3">Opening Range Duration</label>
              <div className="flex gap-2 bg-base p-1 rounded-lg border border-line w-fit">
                {[5, 15, 30].map(val => (
                  <button
                    key={val}
                    onClick={() => setRange(val)}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${range === val ? 'bg-accent text-[var(--color-on-accent)] shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                  >
                    {val}m
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2 items-start bg-accent/5 border border-accent/20 p-3 rounded-lg text-xs text-fg-subtle">
                <Info size={16} className="text-accent shrink-0 mt-0.5" />
                <p>
                  A {range} minute range {range === 5 ? "is highly aggressive but prone to whipsaws. Use only when SPY is gapping heavily." : range === 30 ? "is conservative with fewer, higher quality setups. Best for choppy, summer markets." : "is the mathematical sweet spot for SPY/QQQ. Provides enough time for price discovery while capturing the core morning trend."}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-fg">Take Profit Multiplier</label>
                <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded font-bold">{takeProfit}x Risk</span>
              </div>
              <input 
                type="range" 
                min="1" max="5" step="0.5" 
                value={takeProfit} 
                onChange={e => setTakeProfit(Number(e.target.value))}
                className="w-full h-2 bg-base rounded-lg appearance-none cursor-pointer border border-line focus:outline-none focus:border-accent accent-accent"
              />
              <div className="flex justify-between text-xs font-mono text-fg-muted mt-2">
                <span>1.0x</span>
                <span>5.0x</span>
              </div>
            </div>
          </div>

          <div className="relative rounded-xl border border-line bg-base p-4 overflow-hidden h-[240px] flex items-center justify-center">
            {/* Range Box */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-20 border-y border-dashed border-fg-muted/30 bg-accent/5 transition-all duration-500" 
                 style={{ height: `${range === 5 ? 40 : range === 15 ? 80 : 120}px` }} />
            
            <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-line border-l border-dashed border-line-strong" />
            
            {/* Price line */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <path 
                d="M 32 140 Q 60 160, 80 120 T 120 130 T 150 100 L 180 50 L 250 20" 
                fill="none" 
                stroke="var(--color-accent)" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              <circle cx="150" cy="100" r="4" fill="var(--color-accent)" className="animate-pulse" />
            </svg>

            {/* Annotations */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 text-[9px] font-mono text-fg-muted -rotate-90 origin-center whitespace-nowrap">
              {range}m Range
            </div>

            <div className="absolute top-[40%] left-[65%] text-[10px] font-bold text-profit px-2 py-1 bg-profit/10 rounded border border-profit/30 translate-y-[-100%] translate-x-[-50%]">
              Entry Target
            </div>
            
            <motion.div 
              animate={{ y: Math.max(-40, 40 - (takeProfit * 20)) }}
              className="absolute top-[30%] right-[10%] text-[10px] font-bold text-profit px-2 py-1 bg-profit/20 border border-profit rounded shadow-[0_0_15px_rgba(var(--color-profit),0.3)] z-10"
            >
              TP (+{takeProfit}R)
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="space-y-4 mt-8 bg-surface border border-line rounded-[var(--radius-card)] p-6">
        <div className="flex items-center gap-3 mb-2">
          <Clock size={24} className="text-warning" weight="duotone" />
          <h2 className="text-xl font-semibold text-fg">Time Decay Guards</h2>
        </div>
        <p className="text-fg-subtle leading-relaxed text-sm">
          The best setups occur when the market has maximum liquidity and momentum. This is why Floqex utilizes strict <strong>Time Decay Guards</strong>. By default, the bot stops looking for new entries after <span className="text-fg font-medium">11:00 AM EST</span>. Volume naturally drops during the midday lunch hour, leading to choppy, mean-reverting price action which is mathematically hostile to breakout strategies.
        </p>
      </motion.section>
    </motion.div>
  );
}
