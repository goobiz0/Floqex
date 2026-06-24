"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, MagnifyingGlass, DotsThree, TrendUp, TrendDown, Robot, Activity, ClockCounterClockwise, Plug, ArrowUpRight, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { formatUSD, cn } from "@/lib/utils";
import { motion } from "motion/react";
import { type TradeRow } from "@/lib/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

function HeroCard1({ balance }: { balance: number }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-6"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-profit/5 via-transparent to-transparent opacity-60 pointer-events-none" />
      <div className="relative z-10 flex items-start justify-between">
        <span className="text-[28px] font-medium tracking-tight text-fg tnum">
          {formatUSD(balance)}
        </span>
        <span className="text-sm font-medium text-fg-subtle">Active Capital</span>
      </div>

      <div className="relative z-10 mt-auto">
        <p className="text-sm font-medium text-fg-subtle mb-1">24h PnL</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-profit tnum">+ $1,245.50</span>
          <span className="text-[11px] font-semibold bg-profit/10 px-2 py-0.5 rounded-[var(--radius-pill)] text-profit tnum">+2.4%</span>
        </div>
      </div>
    </motion.div>
  );
}

function HeroCard2() {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col overflow-hidden rounded-[var(--radius-card)] p-6 border border-line bg-elevated"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-fg">Live Execution Feed</h3>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
        </span>
      </div>
      <div className="space-y-3 font-mono text-[11px] mt-1">
        <div className="flex justify-between items-center text-fg">
          <span className="text-profit">BUY</span>
          <span>1.45 BTC</span>
          <span className="text-fg-subtle">@ 64,230</span>
        </div>
        <div className="flex justify-between items-center text-fg">
          <span className="text-negative">SELL</span>
          <span>50.0 AAPL</span>
          <span className="text-fg-subtle">@ 175.40</span>
        </div>
        <div className="flex justify-between items-center text-fg">
          <span className="text-profit">BUY</span>
          <span>100.0 MSFT</span>
          <span className="text-fg-subtle">@ 420.69</span>
        </div>
        <div className="flex justify-between items-center text-fg opacity-50">
          <span className="text-negative">SELL</span>
          <span>10.0 TSLA</span>
          <span className="text-fg-subtle">@ 180.20</span>
        </div>
      </div>
    </motion.div>
  );
}

function HeroCard3() {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col justify-between overflow-hidden rounded-[var(--radius-card)] p-6 border border-line bg-elevated"
    >
      <div>
        <h3 className="text-sm font-medium text-fg mb-1">Risk Heatmap</h3>
        <p className="text-xs text-fg-subtle">Daily Drawdown Status</p>
      </div>
      
      <div className="flex items-end gap-2 mt-auto h-24">
        <div className="flex-1 bg-surface rounded-[4px] h-[30%] relative group transition-colors hover:bg-surface-hover">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-fg transition-opacity">Mon</div>
        </div>
        <div className="flex-1 bg-surface rounded-[4px] h-[40%] relative group transition-colors hover:bg-surface-hover">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-fg transition-opacity">Tue</div>
        </div>
        <div className="flex-1 bg-surface rounded-[4px] h-[15%] relative group transition-colors hover:bg-surface-hover">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-fg transition-opacity">Wed</div>
        </div>
        <div className="flex-1 bg-negative rounded-[4px] h-[85%] relative group transition-colors hover:bg-negative/80">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-negative transition-opacity">Thu</div>
        </div>
        <div className="flex-1 bg-surface rounded-[4px] h-[20%] relative group transition-colors hover:bg-surface-hover">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-fg transition-opacity">Fri</div>
        </div>
      </div>
      <div className="absolute top-[60%] left-0 w-full border-t border-dashed border-negative/30"></div>
      <span className="absolute top-[60%] -mt-4 right-4 text-[10px] text-negative font-mono bg-base px-1">LIMIT</span>
    </motion.div>
  );
}

function HeroCard4() {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] flex-col items-center justify-center rounded-[var(--radius-card)] border border-line bg-elevated p-6 text-center"
    >
      <h3 className="text-sm font-medium text-fg absolute top-6 left-6">Strategy Win Rate</h3>
      <div className="relative flex h-24 w-24 items-center justify-center mt-6">
        <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-surface)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-profit)" strokeWidth="8"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 * 0.32 }} 
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-fg tnum">68%</span>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-fg-subtle font-medium">Past 7 days across 45 trades</p>
    </motion.div>
  );
}

export function DashboardPageClient({ 
  balance, 
  nickname, 
  avatarUrl,
  recent 
}: { 
  balance: number;
  nickname: string;
  avatarUrl: string;
  recent: TradeRow[];
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      
      {/* Header Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={avatarUrl}
            alt={nickname}
            width={40}
            height={40}
            className="rounded-full border border-line object-cover"
          />
          <h1 className="text-lg font-medium tracking-tight text-fg">
            Hi, {nickname}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} />
            <input
              type="text"
              placeholder="Search"
              className="h-10 w-64 rounded-[var(--radius-pill)] border border-line bg-surface px-9 text-[13px] text-fg outline-none transition-colors focus:border-accent focus:bg-base"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-[4px] border border-line bg-base px-1.5 py-0.5 text-[10px] font-medium text-fg-faint">
              ⌘K
            </div>
          </div>
          <button onClick={() => toast.info("Bot creation coming in Phase 6")} className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-medium text-[var(--color-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Plus size={16} weight="bold" />
            New Bot
          </button>
        </div>
      </div>

      {/* Hero Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroCard1 balance={balance} />
        <HeroCard2 />
        <HeroCard3 />
        <HeroCard4 />
      </div>

      {/* Middle Split */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        
        {/* Recent Operations (Left) */}
        <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-6 lg:col-span-5">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-line p-1 bg-base">
              <button onClick={() => toast.info("Filter applied: Recent")} className="rounded-[var(--radius-pill)] bg-surface px-4 py-1.5 text-[12px] font-medium text-fg">
                Recent Operations
              </button>
              <button onClick={() => toast.info("Income filter coming soon")} className="rounded-[var(--radius-pill)] px-4 py-1.5 text-[12px] font-medium text-fg-subtle transition-colors hover:text-fg hover:bg-surface/50">
                Income
              </button>
            </div>
            <button onClick={() => toast.info("More options coming soon")} className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg">
              <DotsThree size={24} weight="bold" />
            </button>
          </div>

          <ul className="space-y-4">
            {recent.map((trade, i) => {
              const netPnlNum = trade.netPnl ? Number(trade.netPnl) : 0;
              const isProfit = netPnlNum >= 0;
              
              return (
                <li key={trade.id} className="group flex items-center justify-between rounded-[var(--radius-control)] p-2 transition-colors hover:bg-surface/50 -mx-2">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
                      isProfit ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative"
                    )}>
                      {isProfit ? <TrendUp size={18} weight="bold" /> : <TrendDown size={18} weight="bold" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-fg">Trade {trade.instrument}</p>
                      <p className="text-[11px] text-fg-subtle mt-0.5">{trade.status}</p>
                    </div>
                  </div>
                  <div className={cn("rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[12px] font-semibold tnum",
                    isProfit ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative"
                  )}>
                    {formatUSD(netPnlNum, { sign: true })}
                  </div>
                </li>
              );
            })}
            {recent.length === 0 && (
              <div className="pt-6 pb-2">
                <EmptyState 
                  title="No recent operations" 
                  description="When your bots execute trades, they will appear here in real-time."
                  icon={<TrendUp size={32} weight="duotone" />}
                />
              </div>
            )}
          </ul>
        </div>

        {/* PnL Breakdown (Right) */}
        <div className="flex flex-col rounded-[var(--radius-card)] border border-line bg-elevated p-6 lg:col-span-7">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-medium text-fg">Asset Class PnL Breakdown</h3>
            <button onClick={() => toast.info("Chart options coming soon")} className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg">
              <DotsThree size={24} weight="bold" />
            </button>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center justify-between text-[13px] mb-2">
                <span className="font-medium text-fg">Equities (NQ, ES)</span>
                <span className="font-semibold text-profit tnum">+$3,240.50</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "65%" }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-profit rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[13px] mb-2">
                <span className="font-medium text-fg">Commodities (Gold)</span>
                <span className="font-semibold text-profit tnum">+$845.20</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "25%" }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                  className="h-full bg-profit/60 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[13px] mb-2">
                <span className="font-medium text-fg">Forex</span>
                <span className="font-semibold text-negative tnum">-$120.00</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "10%" }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-negative rounded-full"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-line mt-4 flex items-center justify-between">
              <span className="text-[12px] font-medium text-fg-subtle">Total Gross PnL</span>
              <span className="text-[14px] font-bold text-fg tnum">$3,965.70</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Trading Specific Widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Widget 1: System Health */}
        <motion.div
          whileHover={{ y: -4 }}
          className="relative flex h-[200px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-accent" />
            <h3 className="text-sm font-medium text-fg">Engine Health</h3>
          </div>
          
          <div className="mt-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-subtle">Core Latency</span>
              <span className="text-[12px] font-mono font-medium text-profit">12ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-subtle">Broker API</span>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-profit">
                <CheckCircle size={14} weight="fill" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-subtle">Uptime</span>
              <span className="text-[12px] font-mono font-medium text-fg">99.99%</span>
            </div>
          </div>
        </motion.div>

        {/* Widget 2: Market Pulse */}
        <motion.div
          whileHover={{ y: -4 }}
          className="relative flex h-[200px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClockCounterClockwise size={18} className="text-accent" />
              <h3 className="text-sm font-medium text-fg">Next Session</h3>
            </div>
          </div>
          
          <div className="mt-auto">
            <p className="text-[12px] text-fg-subtle mb-2">New York Open (ORB)</p>
            <div className="flex items-end gap-3">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-fg tnum">04</span>
                <span className="text-[10px] uppercase tracking-wider text-fg-faint">Hours</span>
              </div>
              <span className="text-2xl font-bold text-line-strong pb-1">:</span>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-fg tnum">23</span>
                <span className="text-[10px] uppercase tracking-wider text-fg-faint">Mins</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Widget 3: Quick Actions */}
        <motion.div
          whileHover={{ y: -4 }}
          className="relative flex h-[200px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight size={18} className="text-accent" />
            <h3 className="text-sm font-medium text-fg">Quick Actions</h3>
          </div>
          
          <div className="mt-auto grid grid-cols-2 gap-2">
            <button className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface py-3 text-[11px] font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg border border-line">
              <Robot size={20} />
              New Bot
            </button>
            <button className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface py-3 text-[11px] font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg border border-line">
              <Plug size={20} />
              Broker
            </button>
            <button className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface py-3 text-[11px] font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg border border-line">
              <WarningCircle size={20} />
              Risk Limits
            </button>
            <button className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface py-3 text-[11px] font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg border border-line">
              <Activity size={20} />
              Audit Log
            </button>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
