"use client";

import { useState } from "react";
import { Info, Target, Strategy } from "@phosphor-icons/react";

export default function StrategyPage() {
  const [range, setRange] = useState(15);
  const [takeProfit, setTakeProfit] = useState(2.5);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-fg">ORB Strategy</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          The Opening Range Breakout (ORB) strategy is one of the most reliable and highly traded setups in the morning session. This page explains exactly how the bot trades it.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">The Concept</h2>
        <p className="text-fg-subtle leading-relaxed">
          The market open is the most volatile period of the day. Institutional players are executing large orders, and the price rapidly discovers fair value. The ORB strategy capitalizes on this by identifying the high and low of the first X minutes (the "Opening Range"), and entering a trade when price decisively breaks out of that range.
        </p>
      </section>

      {/* Interactive Interactive Component */}
      <section className="space-y-6 mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="p-2 bg-accent-soft rounded-lg text-accent">
            <Target size={24} />
          </div>
          <h2 className="text-xl font-semibold text-fg">Interactive ORB Visualizer</h2>
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
                A {range} minute range {range === 5 ? "is aggressive but has lower win rate." : range === 30 ? "is highly conservative with fewer setups." : "is the sweet spot for SPY/QQQ."}
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
            <div className="absolute top-8 left-1/2 text-[10px] font-bold text-profit px-2 py-1 bg-profit/10 rounded">
              Entry
            </div>
            <div className="absolute top-[20%] right-[10%] text-[10px] font-bold text-profit px-2 py-1 border border-profit rounded">
              TP (+{takeProfit}R)
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Time Decay Rules</h2>
        <p className="text-fg-subtle leading-relaxed">
          The best setups occur when the market has maximum liquidity and momentum. This is why Floqex utilizes strict <strong>Time Decay Guards</strong>. By default, the bot stops looking for new entries after 11:00 AM EST. Volume naturally drops during the midday lunch hour, leading to choppy, mean-reverting price action which is hostile to breakout strategies.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Mochi Copilot Integration</h2>
        <p className="text-fg-subtle leading-relaxed">
          While the algorithm runs autonomously, you retain control as the pilot. Using the <strong>Mochi Chat Assistant</strong> (the floating button in your dashboard), you can use natural language to override parameters on the fly. 
        </p>
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-4 flex flex-col space-y-2 font-mono text-sm">
          <div className="flex items-center gap-2 text-fg-subtle">
            <span className="text-accent font-bold">You:</span> "Mochi, the market looks choppy today. Reduce my risk to 0.5%."
          </div>
          <div className="flex items-center gap-2 text-fg">
            <span className="text-profit font-bold">Mochi:</span> "Understood. I have updated your strategy risk to 0.5%. Good call."
          </div>
        </div>
      </section>
    </div>
  );
}
