"use client";

import { useState } from "react";
import { ShieldCheck, WarningCircle, Calculator, Info, LockKey, Target } from "@phosphor-icons/react";
import { motion } from "motion/react";

export default function RiskPage() {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [winRate, setWinRate] = useState(55);
  const [rrRatio, setRrRatio] = useState(2);

  const riskDollar = accountSize * (riskPercent / 100);
  const expectancy = (winRate / 100) * (riskDollar * rrRatio) - ((100 - winRate) / 100) * riskDollar;
  
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
          <ShieldCheck size={14} weight="duotone" />
          Defense First
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-fg">Risk Management</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed max-w-2xl">
          The most important aspect of trading is not the entry, but the risk. Floqex enforces ironclad guardrails that prevent emotional blow-ups and protect your capital.
        </p>
      </motion.header>

      <motion.section variants={itemVariants} className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">The Circuit Breaker</h2>
        <div className="flex flex-col sm:flex-row gap-5 p-6 rounded-[var(--radius-card)] border border-negative/30 bg-negative/5 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-negative/10 flex items-center justify-center shrink-0 text-negative">
            <WarningCircle size={28} weight="duotone" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-fg">Max Daily Drawdown (MDD)</h3>
            <p className="text-sm leading-relaxed text-fg-subtle">
              If your account loses a specified percentage in a single day (default 3%), the bot will automatically <strong className="text-negative">HARD STOP</strong>. It cancels all pending orders and will refuse to take any more trades until the next session. This is the ultimate defense against market chops and revenge trading.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Interactive Calculator */}
      <motion.section variants={itemVariants} className="space-y-6 mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <Calculator size={200} weight="fill" />
        </div>
        <div className="flex items-center gap-3 border-b border-line pb-4 relative z-10">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <Calculator size={24} weight="duotone" />
          </div>
          <h2 className="text-xl font-semibold text-fg">Expectancy & Risk Calculator</h2>
        </div>
        
        <div className="grid gap-10 md:grid-cols-2 relative z-10 pt-4">
          <div className="space-y-8">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-fg flex justify-between mb-2">
                  <span>Account Size</span>
                  <span className="font-mono text-accent bg-accent/10 px-2 py-0.5 rounded font-bold">${accountSize.toLocaleString()}</span>
                </label>
                <input type="range" min="1000" max="100000" step="1000" value={accountSize} onChange={e => setAccountSize(Number(e.target.value))} className="w-full h-2 bg-base rounded-lg appearance-none cursor-pointer border border-line focus:outline-none focus:border-accent accent-accent" />
              </div>

              <div>
                <label className="text-sm font-medium text-fg flex justify-between mb-2">
                  <span>Risk Per Trade (%)</span>
                  <span className="font-mono text-negative bg-negative/10 px-2 py-0.5 rounded font-bold">{riskPercent.toFixed(2)}%</span>
                </label>
                <input type="range" min="0.25" max="5" step="0.25" value={riskPercent} onChange={e => setRiskPercent(Number(e.target.value))} className="w-full h-2 bg-base rounded-lg appearance-none cursor-pointer border border-line focus:outline-none focus:border-negative accent-negative" />
              </div>
            </div>
            
            <div className="w-full h-px bg-line/50" />

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-fg flex justify-between mb-2">
                  <span>Win Rate (%)</span>
                  <span className="font-mono text-fg bg-base px-2 py-0.5 rounded border border-line">{winRate}%</span>
                </label>
                <input type="range" min="30" max="80" step="1" value={winRate} onChange={e => setWinRate(Number(e.target.value))} className="w-full h-2 bg-base rounded-lg appearance-none cursor-pointer border border-line focus:outline-none focus:border-accent accent-accent" />
              </div>
              
              <div>
                <label className="text-sm font-medium text-fg flex justify-between mb-2">
                  <span>Reward:Risk Ratio</span>
                  <span className="font-mono text-profit bg-profit/10 px-2 py-0.5 rounded font-bold">{rrRatio.toFixed(1)}:1</span>
                </label>
                <input type="range" min="1" max="5" step="0.5" value={rrRatio} onChange={e => setRrRatio(Number(e.target.value))} className="w-full h-2 bg-base rounded-lg appearance-none cursor-pointer border border-line focus:outline-none focus:border-profit accent-profit" />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-base border border-line rounded-[var(--radius-card)] p-5 relative overflow-hidden group hover:border-negative/30 transition-colors">
                <div className="absolute right-0 bottom-0 opacity-5 p-2 transition-transform group-hover:scale-110">
                  <WarningCircle size={60} weight="fill" />
                </div>
                <p className="text-sm font-medium text-fg-subtle relative z-10">Dollar Risk</p>
                <p className="text-3xl font-mono font-bold text-negative mt-2 relative z-10">${riskDollar.toFixed(2)}</p>
              </div>
              <div className="bg-base border border-line rounded-[var(--radius-card)] p-5 relative overflow-hidden group hover:border-profit/30 transition-colors">
                <div className="absolute right-0 bottom-0 opacity-5 p-2 transition-transform group-hover:scale-110">
                  <Target size={60} weight="fill" />
                </div>
                <p className="text-sm font-medium text-fg-subtle relative z-10">Reward</p>
                <p className="text-3xl font-mono font-bold text-profit mt-2 relative z-10">${(riskDollar * rrRatio).toFixed(2)}</p>
              </div>
            </div>
            
            <motion.div 
              animate={{ backgroundColor: expectancy > 0 ? "rgba(var(--color-positive-rgb), 0.05)" : "rgba(var(--color-negative-rgb), 0.05)" }}
              className={`border rounded-[var(--radius-card)] p-6 relative overflow-hidden ${expectancy > 0 ? 'border-positive/30' : 'border-negative/30'}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-fg-subtle relative z-10">
                Expected Value (Per Trade) 
                <div className="group/info relative cursor-help">
                  <Info size={16} className="text-fg-muted hover:text-fg transition-colors" />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-3 bg-surface border border-line shadow-xl text-fg text-xs rounded-[var(--radius-control)] opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all pointer-events-none z-50 text-center leading-relaxed">
                    Average expected profit per trade over a large sample size based on win rate and R:R.
                  </div>
                </div>
              </div>
              <motion.p 
                key={expectancy}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-5xl font-mono font-bold mt-3 tracking-tighter relative z-10 ${expectancy > 0 ? 'text-positive' : 'text-negative'}`}
              >
                {expectancy > 0 ? '+' : ''}${expectancy.toFixed(2)}
              </motion.p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Position Sizing Mathematics</h2>
        <div className="grid gap-6 mt-6 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm hover:border-accent/30 transition-colors group">
            <div className="h-10 w-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calculator size={20} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold text-fg">Dynamic Share Sizing</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed h-16">
              You define the exact percentage you are willing to lose. The bot calculates the position size dynamically based on the distance from the entry price to the stop loss.
            </p>
            <div className="mt-4 p-4 bg-base rounded-[var(--radius-control)] border border-line font-mono text-[13px] text-fg-muted overflow-x-auto shadow-inner">
              <span className="text-accent">Shares</span> = (Account * Risk%) / (Entry - Stop)
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm hover:border-positive/30 transition-colors group">
            <div className="h-10 w-10 bg-positive/10 text-positive rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LockKey size={20} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold text-fg">Automatic Stop Losses</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed h-16">
              Every order sent to the broker includes a hard stop loss via an OCO bracket. If the broker API disconnects or your internet goes down, your stop is already resting on their exchange servers.
            </p>
            <div className="mt-4 p-4 bg-positive/5 rounded-[var(--radius-control)] border border-positive/20 text-sm font-medium text-positive flex items-center justify-center">
              100% Exchange-Side Protection
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
