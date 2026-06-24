"use client";

import Image from "next/image";
import { Plus, MagnifyingGlass, DotsThree, TrendUp, TrendDown, Robot, Heartbeat, ClockCounterClockwise, Plug, ArrowUpRight, WarningCircle, CheckCircle, Wallet, ChartLineUp, Info, Lightning, WarningOctagon, Target } from "@phosphor-icons/react/dist/ssr";
import { formatUSD, cn } from "@/lib/utils";
import { motion } from "motion/react";
import { type TradeRow, type DailyRow, type AgentEventRow } from "@/lib/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import Link from "next/link";

function HeroCard1({ balance, hasAccount, todayPnl }: { balance: number; hasAccount: boolean, todayPnl: number }) {
  const isProfit = todayPnl >= 0;
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-6"
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-60 pointer-events-none", isProfit ? "from-profit/5" : "from-negative/5")} />
      <div className="relative z-10 flex items-start justify-between">
        <span className="text-[28px] font-medium tracking-tight text-fg tnum">
          {hasAccount ? formatUSD(balance) : "$0.00"}
        </span>
        <span className="text-sm font-medium text-fg-subtle">Active Capital</span>
      </div>

      <div className="relative z-10 mt-auto">
        <p className="text-sm font-medium text-fg-subtle mb-1">24h PnL</p>
        <div className="flex items-center gap-2">
          {!hasAccount ? (
            <span className="text-sm font-semibold text-fg-subtle">No Account</span>
          ) : todayPnl === 0 ? (
            <span className="text-sm font-semibold text-fg-subtle">Awaiting Trades</span>
          ) : (
            <span className={cn("text-sm font-semibold tnum", isProfit ? "text-profit" : "text-negative")}>
              {formatUSD(todayPnl, { sign: true })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EventIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "INFO": return <Info size={14} className="text-fg-subtle" weight="bold" />;
    case "SIGNAL": return <Lightning size={14} className="text-accent" weight="bold" />;
    case "TRADE": return <Target size={14} className="text-profit" weight="bold" />;
    case "RISK": return <WarningOctagon size={14} className="text-warning" weight="bold" />;
    default: return <Heartbeat size={14} className="text-fg-muted" weight="bold" />;
  }
}

function HeroCard2({ hasBot, agentEvents, engineStatus }: { hasBot: boolean, agentEvents: AgentEventRow[], engineStatus: "ONLINE" | "DEGRADED" | "OFFLINE" }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col overflow-hidden rounded-[var(--radius-card)] p-6 border border-line bg-elevated"
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-fg">Live Execution Feed</h3>
          {engineStatus === "DEGRADED" && (
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-warning bg-warning/10 px-1.5 py-0.5 rounded-[4px]">
              <WarningCircle size={12} weight="fill" /> Degraded
            </span>
          )}
          {engineStatus === "OFFLINE" && (
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-negative bg-negative/10 px-1.5 py-0.5 rounded-[4px]">
              <WarningCircle size={12} weight="fill" /> Offline
            </span>
          )}
        </div>
        {hasBot && engineStatus === "ONLINE" && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {!hasBot ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-fg-subtle px-4 text-center">Your live execution feed will appear here once you create a bot.</p>
          </div>
        ) : agentEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-fg-subtle px-4 text-center">Listening for agent events...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 h-full justify-end pb-1">
            {agentEvents.slice(0, 3).reverse().map(event => (
              <div key={event.id} className="flex gap-2 items-start opacity-80 hover:opacity-100 transition-opacity animate-in fade-in slide-in-from-bottom-2">
                <div className="mt-0.5 shrink-0">
                  <EventIcon kind={event.kind} />
                </div>
                <div>
                  <p className="text-[11px] font-mono text-fg-faint">{event.t}</p>
                  <p className="text-[11px] text-fg-subtle leading-tight line-clamp-2">{event.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HeroCard3({ hasBot }: { hasBot: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] w-full flex-col justify-between overflow-hidden rounded-[var(--radius-card)] p-6 border border-line bg-elevated"
    >
      <div>
        <h3 className="text-sm font-medium text-fg mb-1">Risk Heatmap</h3>
        <p className="text-xs text-fg-subtle">Daily Drawdown Status</p>
      </div>
      
      <div className="flex flex-col items-center justify-center h-full text-center mt-2">
        <p className="text-xs text-fg-subtle px-4">Insufficient data to build heatmap. Awaiting bot execution.</p>
      </div>
    </motion.div>
  );
}

function HeroCard4({ hasBot, winRate }: { hasBot: boolean, winRate: number | null }) {
  const dashOffset = winRate ? 251 - (251 * winRate) / 100 : 251;
  const isProfit = winRate && winRate > 50;
  const strokeColor = winRate === null ? "var(--color-surface)" : isProfit ? "var(--color-profit)" : "var(--color-negative)";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative flex h-[220px] flex-col items-center justify-center rounded-[var(--radius-card)] border border-line bg-elevated p-6 text-center"
    >
      <h3 className="text-sm font-medium text-fg absolute top-6 left-6">Strategy Win Rate</h3>
      <div className="relative flex h-24 w-24 items-center justify-center mt-6">
        <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-surface)" strokeWidth="8" />
          {winRate !== null && (
            <circle 
              cx="50" cy="50" r="40" fill="transparent" stroke={strokeColor} strokeWidth="8"
              strokeDasharray="251" strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-fg-subtle tnum">
            {winRate !== null ? `${winRate.toFixed(1)}%` : "N/A"}
          </span>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-fg-subtle font-medium">
        {winRate !== null ? "Based on recent operations" : "No recent trades"}
      </p>
    </motion.div>
  );
}

export function DashboardPageClient({ 
  balance, 
  nickname, 
  avatarUrl,
  recent,
  hasAccount,
  hasBot,
  summaries = [],
  trades = [],
  agentEvents = [],
  botStatus = "NONE"
}: { 
  balance: number;
  nickname: string;
  avatarUrl: string;
  recent: TradeRow[];
  hasAccount: boolean;
  hasBot: boolean;
  summaries?: DailyRow[];
  trades?: TradeRow[];
  agentEvents?: AgentEventRow[];
  botStatus?: string;
  lastHeartbeat?: string | null;
}) {

  // Compute metrics
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todaySummary = summaries.find(s => s.date === todayDateStr);
  const todayPnl = todaySummary?.netPnl ?? 0;

  // Compute Engine Health based on lastHeartbeat (if RUNNING, we expect a heartbeat every 10-30 seconds)
  let engineStatus: "ONLINE" | "DEGRADED" | "OFFLINE" = "OFFLINE";
  if (botStatus === "RUNNING") {
    if (lastHeartbeat) {
      const msSinceHeartbeat = Date.now() - new Date(lastHeartbeat).getTime();
      if (msSinceHeartbeat < 60000) {
        engineStatus = "ONLINE"; // < 1 minute
      } else if (msSinceHeartbeat < 300000) {
        engineStatus = "DEGRADED"; // 1 to 5 minutes
      } else {
        engineStatus = "OFFLINE"; // > 5 minutes
      }
    } else {
      engineStatus = "OFFLINE";
    }
  }

  let totalWins = 0;
  let totalTrades = 0;
  for (const s of summaries) {
    totalWins += s.winCount;
    totalTrades += s.tradeCount;
  }
  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;

  // Group PnL by instrument
  const assetPnl = trades.reduce((acc, t) => {
    if (!acc[t.instrument]) acc[t.instrument] = 0;
    if (t.netPnl) acc[t.instrument] += t.netPnl;
    return acc;
  }, {} as Record<string, number>);
  const assetEntries: [string, number][] = Object.entries(assetPnl).sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][];

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
          {hasAccount && (
            <Link href="/dashboard/bots/new" className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-medium text-[var(--color-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Plus size={16} weight="bold" />
              New Bot
            </Link>
          )}
        </div>
      </div>

      {!hasAccount ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-12 text-center mt-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-6 border border-line">
            <Wallet size={32} className="text-fg-subtle" weight="duotone" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-fg mb-2">Connect a Broker</h2>
          <p className="text-fg-subtle mb-8 max-w-md mx-auto">
            Your dashboard is empty because you haven't connected a broker yet. Connect a live brokerage account or start with a Paper Trading simulator.
          </p>
          <Link href="/dashboard/accounts/new" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 text-sm font-medium text-[var(--color-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
            Add Account
          </Link>
        </div>
      ) : !hasBot ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-12 text-center mt-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-6 border border-line">
            <Robot size={32} className="text-fg-subtle" weight="duotone" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-fg mb-2">Create your first Bot</h2>
          <p className="text-fg-subtle mb-8 max-w-md mx-auto">
            You have an active account, but no bots are managing it yet. Create a bot and configure its strategy to begin automated trading.
          </p>
          <Link href="/dashboard/bots/new" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 text-sm font-medium text-[var(--color-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Plus size={16} weight="bold" />
            Create Bot
          </Link>
        </div>
      ) : null}

      {/* Hero Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroCard1 balance={balance} hasAccount={hasAccount} todayPnl={todayPnl} />
        <HeroCard2 hasBot={hasBot} agentEvents={agentEvents} engineStatus={engineStatus} />
        <HeroCard3 hasBot={hasBot} />
        <HeroCard4 hasBot={hasBot} winRate={winRate} />
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
                      <p className="text-[13px] font-medium text-fg">{trade.direction} {trade.instrument}</p>
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
                  description="When your bots execute trades, they will appear here."
                  icon={<ChartLineUp size={32} weight="duotone" />}
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

          <div className="flex-1 flex flex-col justify-center">
            {assetEntries.length === 0 ? (
              <EmptyState 
                title="Insufficient Data" 
                description="Your bots must execute trades across different asset classes for the breakdown to populate."
                icon={<ChartLineUp size={32} weight="duotone" />}
              />
            ) : (
              <div className="space-y-4">
                {assetEntries.map(([instrument, pnl]) => (
                  <div key={instrument} className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-fg">{instrument}</span>
                    <span className={cn("font-semibold text-[13px] tnum", pnl >= 0 ? "text-profit" : "text-negative")}>
                      {formatUSD(pnl, { sign: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
            <Heartbeat size={18} className="text-accent" />
            <h3 className="text-sm font-medium text-fg">Engine Health</h3>
          </div>
          
          <div className="mt-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-subtle">Bot Status</span>
              <span className={cn("text-[12px] font-medium", botStatus === "RUNNING" ? "text-profit" : "text-fg-subtle")}>
                {botStatus}
              </span>
            </div>
            {botStatus === "RUNNING" && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-fg-subtle">Engine Health</span>
                <span className={cn(
                  "flex items-center gap-1.5 text-[12px] font-medium",
                  engineStatus === "ONLINE" ? "text-profit" : engineStatus === "DEGRADED" ? "text-warning" : "text-negative"
                )}>
                  {engineStatus === "ONLINE" ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
                  {engineStatus}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-subtle">Broker API</span>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-fg-subtle">
                <CheckCircle size={14} weight="fill" className={hasAccount ? "text-profit" : ""} />
                {hasAccount ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-subtle">Core Latency</span>
              <span className="text-[12px] font-mono font-medium text-profit">12ms</span>
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
            <Link href="/dashboard/bots/new" className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface py-3 text-[11px] font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg border border-line">
              <Robot size={20} />
              New Bot
            </Link>
            <Link href="/dashboard/accounts/new" className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface py-3 text-[11px] font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg border border-line">
              <Plug size={20} />
              Broker
            </Link>
            <button onClick={() => toast.info("Risk Limits coming soon")} className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface py-3 text-[11px] font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg border border-line">
              <WarningCircle size={20} />
              Risk Limits
            </button>
            <button onClick={() => toast.info("Audit Log coming soon")} className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface py-3 text-[11px] font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg border border-line">
              <Heartbeat size={20} />
              Audit Log
            </button>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
