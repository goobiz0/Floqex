"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, MagnifyingGlass, DotsThree, CaretDown, TrendUp, TrendDown } from "@phosphor-icons/react";
import { formatUSD } from "@/lib/utils";
import { motion } from "motion/react";
import { type TradeRow } from "@/lib/queries";

function HeroCard1({ balance }: { balance: number }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col justify-between overflow-hidden rounded-[32px] p-6 text-white shadow-sm"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      {/* Animated gradient blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 20, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/40 blur-[50px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/30 blur-[60px]"
      />

      <div className="relative z-10 flex items-start justify-between">
        <span className="text-[28px] font-medium tracking-tight">
          {formatUSD(balance)}
        </span>
        <span className="text-sm font-medium text-white/80">Floqex Live</span>
      </div>

      <div className="relative z-10 flex items-end justify-between">
        <div>
          <p className="text-lg font-medium tracking-widest text-white/90">
            •••• •••• •••• 4456
          </p>
          <p className="mt-1 text-[13px] font-medium text-white/70">
            Algorithmic Account
          </p>
        </div>
        <div className="flex h-8 w-12 items-center justify-end gap-[-8px]">
          <div className="h-6 w-6 rounded-full bg-red-500/80 mix-blend-screen" />
          <div className="relative -ml-2 h-6 w-6 rounded-full bg-yellow-400/80 mix-blend-screen" />
        </div>
      </div>
    </motion.div>
  );
}

function HeroCard2() {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative flex h-[220px] w-full flex-col items-center justify-center overflow-hidden rounded-[32px] p-6 text-center shadow-sm"
      style={{
        background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
      }}
    >
      {/* Interactive hover blob */}
      <motion.div
        className="absolute inset-0 bg-white/0 transition-colors duration-500 group-hover:bg-white/10"
      />
      <h3 className="relative z-10 max-w-[140px] text-[22px] font-semibold leading-[1.15] tracking-tight text-white">
        What to see new in strategies?
      </h3>
    </motion.div>
  );
}

function HeroCard3() {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative flex h-[220px] w-full flex-col items-center justify-end overflow-hidden rounded-[32px] p-6 text-center shadow-sm bg-white"
    >
      <div className="absolute inset-0 bg-slate-50" />
      {/* Animated soft gradient mesh */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[50%] left-[10%] h-[150%] w-[150%] origin-center rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-200/40 via-emerald-100/20 to-transparent blur-3xl"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-[50%] right-[10%] h-[150%] w-[150%] origin-center rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-200/40 via-orange-100/20 to-transparent blur-3xl"
      />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] transition-all duration-500 group-hover:backdrop-blur-none" />
      <h3 className="relative z-10 max-w-[140px] text-[15px] font-semibold leading-[1.3] text-slate-800">
        How to protect your accounts?
      </h3>
    </motion.div>
  );
}

function HeroCard4() {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col items-center justify-end overflow-hidden rounded-[32px] p-6 text-center shadow-sm"
      style={{
        background: "linear-gradient(to bottom right, #fb7185, #fdba74)",
      }}
    >
      {/* Dark overlay / vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      
      <h3 className="relative z-10 max-w-[160px] text-[15px] font-medium leading-[1.3] text-white/90">
        Mobile terminals for any business
      </h3>
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
          <img
            src={avatarUrl}
            alt={nickname}
            className="h-10 w-10 rounded-full border border-line object-cover"
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
          <button className="flex h-10 items-center gap-2 rounded-full bg-fg px-4 text-sm font-medium text-base transition-transform hover:scale-105 active:scale-95">
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
              <button className="rounded-full bg-surface px-4 py-1.5 text-[13px] font-medium text-fg shadow-sm">
                Recent Operations
              </button>
              <button className="rounded-full px-4 py-1.5 text-[13px] font-medium text-fg-subtle transition-colors hover:text-fg">
                Income
              </button>
              <button className="rounded-full px-4 py-1.5 text-[13px] font-medium text-fg-subtle transition-colors hover:text-fg">
                Costs
              </button>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg">
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
              <li className="py-8 text-center text-sm text-fg-subtle">No recent trades.</li>
            )}
          </ul>
        </div>

        {/* Expense/Income Chart (Right) */}
        <div className="flex min-h-[300px] flex-col rounded-[32px] border border-line bg-base p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-full border border-line p-1">
              <button className="rounded-full bg-surface px-4 py-1.5 text-[13px] font-medium text-fg shadow-sm">
                Recent PnL
              </button>
              <button className="rounded-full px-4 py-1.5 text-[13px] font-medium text-fg-subtle transition-colors hover:text-fg">
                Volume
              </button>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg">
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
        <button className="w-full max-w-[800px] rounded-full border border-line py-3 text-[13px] font-medium text-fg-subtle transition-colors hover:border-line-strong hover:text-fg">
          Load More
        </button>
      </div>
    </div>
  );
}
