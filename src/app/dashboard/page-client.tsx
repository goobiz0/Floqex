/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, MagnifyingGlass, DotsThree, CaretDown, TrendUp, TrendDown } from "@phosphor-icons/react";
import { formatUSD } from "@/lib/utils";
import { motion } from "motion/react";
import { type TradeRow } from "@/lib/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

function HeroCard1({ balance }: { balance: number }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col justify-between overflow-hidden rounded-[32px] p-6 text-white shadow-sm"
      style={{
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", // Light emerald gradient
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60" />
      <div className="relative z-10 flex items-start justify-between">
        <span className="text-[28px] font-medium tracking-tight">
          {formatUSD(balance)}
        </span>
        <span className="text-sm font-medium text-white/90">Active Capital</span>
      </div>

      <div className="relative z-10 mt-auto">
        <p className="text-sm font-medium text-white/80 mb-1">24h PnL</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">+ $1,245.50</span>
          <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full text-white">+2.4%</span>
        </div>
      </div>
    </motion.div>
  );
}

function HeroCard2() {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col overflow-hidden rounded-[32px] p-6 shadow-sm border border-line bg-base"
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
      className="relative flex h-[220px] w-full flex-col justify-between overflow-hidden rounded-[32px] p-6 shadow-sm border border-line bg-base"
    >
      <div>
        <h3 className="text-sm font-medium text-fg mb-1">Risk Heatmap</h3>
        <p className="text-xs text-fg-subtle">Daily Drawdown Status</p>
      </div>
      
      <div className="flex items-end gap-2 mt-auto h-24">
        <div className="flex-1 bg-surface rounded-t-sm h-[30%] relative group transition-colors hover:bg-surface-hover">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-fg transition-opacity">Mon</div>
        </div>
        <div className="flex-1 bg-surface rounded-t-sm h-[40%] relative group transition-colors hover:bg-surface-hover">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-fg transition-opacity">Tue</div>
        </div>
        <div className="flex-1 bg-surface rounded-t-sm h-[15%] relative group transition-colors hover:bg-surface-hover">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-fg transition-opacity">Wed</div>
        </div>
        <div className="flex-1 bg-negative/80 rounded-t-sm h-[85%] relative group transition-colors hover:bg-negative">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-negative transition-opacity">Thu</div>
        </div>
        <div className="flex-1 bg-accent/80 rounded-t-sm h-[20%] relative group transition-colors hover:bg-accent">
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-accent transition-opacity">Fri</div>
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
      className="relative flex h-[220px] flex-col items-center justify-center rounded-[32px] border border-line bg-base p-6 text-center shadow-sm"
    >
      <h3 className="text-sm font-medium text-fg absolute top-6 left-6">Strategy Win Rate</h3>
      <div className="relative flex h-24 w-24 items-center justify-center mt-6">
        <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-surface)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-accent)" strokeWidth="8"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 * 0.32 }} 
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-fg">68%</span>
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
              className="h-10 w-64 rounded-full border border-line bg-surface px-9 text-sm text-fg outline-none transition-colors focus:border-line-strong focus:bg-base"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md border border-line bg-base px-1.5 py-0.5 text-[10px] font-medium text-fg-faint">
              ⌘K
            </div>
          </div>
          <button onClick={() => toast.info("Bot creation coming in Phase 6")} className="flex h-10 items-center gap-2 rounded-full bg-fg px-4 text-sm font-medium text-base transition-transform hover:scale-105 active:scale-95">
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
        <div className="rounded-[32px] border border-line bg-base p-6 lg:col-span-5">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-full border border-line p-1">
              <button onClick={() => toast.info("Filter applied: Recent")} className="rounded-full bg-surface px-4 py-1.5 text-[13px] font-medium text-fg shadow-sm">
                Recent Operations
              </button>
              <button onClick={() => toast.info("Income filter coming soon")} className="rounded-full px-4 py-1.5 text-[13px] font-medium text-fg-subtle transition-colors hover:text-fg">
                Income
              </button>
              <button onClick={() => toast.info("Costs filter coming soon")} className="rounded-full px-4 py-1.5 text-[13px] font-medium text-fg-subtle transition-colors hover:text-fg">
                Costs
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
              const logoColors = [
                "bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500", "bg-cyan-500"
              ];
              const color = logoColors[i % logoColors.length];
              
              return (
                <li key={trade.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white ${color}`}>
                      <span className="text-sm font-bold">{trade.instrument.substring(0, 2)}</span>
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-fg">Trade {trade.instrument}</p>
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                    isProfit ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative"
                  }`}>
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

        {/* Expense/Income Chart (Right) */}
        <div className="flex min-h-[300px] flex-col rounded-[32px] border border-line bg-base p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-full border border-line p-1">
              <button onClick={() => toast.info("Viewing Recent PnL")} className="rounded-full bg-surface px-4 py-1.5 text-[13px] font-medium text-fg shadow-sm">
                Recent PnL
              </button>
              <button onClick={() => toast.info("Volume view coming soon")} className="rounded-full px-4 py-1.5 text-[13px] font-medium text-fg-subtle transition-colors hover:text-fg">
                Volume
              </button>
            </div>
            <button onClick={() => toast.info("Chart options coming soon")} className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg">
              <DotsThree size={24} weight="bold" />
            </button>
          </div>

          {/* Overlapping Bubble Chart implementation */}
          <div className="relative mt-8 flex flex-1 items-center justify-center">
            <div className="flex items-center justify-center gap-[-20px]">
              <motion.div 
                whileHover={{ scale: 1.05, zIndex: 10 }}
                className="relative z-[1] flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg mix-blend-multiply"
                title="Total PnL in Crypto trades: $154"
              >
                <span className="text-xl font-bold">$154</span>
                <span className="absolute -bottom-8 text-xs font-medium text-fg-subtle">Crypto</span>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05, zIndex: 10 }}
                className="relative -ml-6 z-[2] flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-lg mix-blend-multiply"
                title="Total PnL in Forex trades: $256"
              >
                <span className="text-2xl font-bold">$256</span>
                <span className="absolute -bottom-8 text-xs font-medium text-fg-subtle">Forex</span>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05, zIndex: 10 }}
                className="relative -ml-8 z-[3] flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow-lg mix-blend-multiply"
                title="Total PnL in Equities trades: $121"
              >
                <span className="text-lg font-bold">$121</span>
                <span className="absolute -bottom-8 text-xs font-medium text-fg-subtle">Equities</span>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05, zIndex: 10 }}
                className="relative -ml-6 z-[4] flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg mix-blend-multiply"
                title="Total PnL in Options trades: $87"
              >
                <span className="text-base font-bold">$87</span>
                <span className="absolute -bottom-8 text-xs font-medium text-fg-subtle">Options</span>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.05, zIndex: 10 }}
                className="relative -ml-6 z-[5] flex h-[104px] w-[104px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg mix-blend-multiply"
                title="Total PnL in Futures trades: $95"
              >
                <span className="text-base font-bold">$95</span>
                <span className="absolute -bottom-8 text-xs font-medium text-fg-subtle">Futures</span>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.05, zIndex: 10 }}
                className="relative -ml-5 z-[6] flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg mix-blend-multiply"
                title="Total PnL in Bonds trades: $56"
              >
                <span className="text-sm font-bold">$56</span>
                <span className="absolute -bottom-8 text-xs font-medium text-fg-subtle">Bonds</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Abstract nature gradient */}
        <motion.div
          whileHover={{ y: -4 }}
          className="relative flex h-[240px] flex-col justify-end overflow-hidden rounded-[32px] p-6 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #022c22 0%, #064e3b 100%)" }}
        >
          {/* SVG Abstract forms inside */}
          <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,100 C30,80 70,80 100,100 L100,0 L0,0 Z" fill="url(#grad1)" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <h3 className="relative z-10 text-[15px] font-medium leading-snug">
            5% Cashback on all items for care
          </h3>
        </motion.div>

        {/* Card 2: Promotions */}
        <motion.div
          whileHover={{ y: -4 }}
          className="relative flex h-[240px] flex-col items-center justify-center overflow-hidden rounded-[32px] bg-[#e1143f] p-6 text-center text-white shadow-sm"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <span className="text-2xl font-bold italic text-white">a</span>
          </div>
          <h3 className="mt-auto text-[15px] font-medium leading-snug">
            What to Buy on Amazon for the Holidays?
          </h3>
        </motion.div>

        {/* Card 3: Radial Progress */}
        <motion.div
          whileHover={{ y: -4 }}
          className="flex h-[240px] flex-col items-center justify-center rounded-[32px] border border-line bg-base p-6 text-center shadow-sm"
        >
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="8"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 * 0.3 }} // 70% complete
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
              <motion.circle
                cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="8"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 * 0.7 }} // 30% complete
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="mt-6 text-[15px] font-medium text-fg">
            Analyze your spending now
          </h3>
        </motion.div>
      </div>

      <div className="flex justify-center pt-4">
        <button onClick={() => toast.info("No more activity to load")} className="w-full max-w-[800px] rounded-full border border-line py-3 text-[13px] font-medium text-fg-subtle transition-colors hover:border-line-strong hover:text-fg">
          Load More
        </button>
      </div>
    </div>
  );
}
