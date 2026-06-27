"use client";

import Image from "next/image";
import { Plus, MagnifyingGlass, DotsThree, TrendUp, TrendDown, Robot, Heartbeat, ClockCounterClockwise, Plug, ArrowUpRight, WarningCircle, CheckCircle, Wallet, ChartLineUp, Info, Lightning, WarningOctagon, Target, CaretDown, Gear, PencilSimple, Check, Trash } from "@phosphor-icons/react/dist/ssr";
import { formatUSD, cn } from "@/lib/utils";
import { motion } from "motion/react";
import { type TradeRow, type DailyRow, type AgentEventRow } from "@/lib/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import Link from "next/link";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { DisplayValue } from "@/components/ui/display-value";
import { CountUp } from "@/components/ui/count-up";
import { DashboardError } from "@/components/dashboard/states";
import { AssetPnlChart } from "@/components/dashboard/asset-pnl-chart";

import { WidgetGrid, WidgetItem } from "@/components/dashboard/widget-grid";
import { WidgetConfigDialog } from "@/components/dashboard/widget-config-dialog";
import { WidgetLibraryDialog } from "@/components/dashboard/widget-library-dialog";
import { MarketSessionsWidget } from "@/components/dashboard/market-sessions-widget";
import { TopMoversWidget } from "@/components/dashboard/top-movers-widget";
import { NetworkLatencyWidget } from "@/components/dashboard/network-latency-widget";
import { StreakHeatmapWidget } from "@/components/dashboard/streak-heatmap-widget";
import { LiveTapeWidget } from "@/components/dashboard/live-tape-widget";
import { RiskMatrixWidget } from "@/components/dashboard/risk-matrix-widget";
import { DrawdownWidget } from "@/components/dashboard/drawdown-widget";
import { RDistributionWidget } from "@/components/dashboard/r-distribution-widget";
import { SessionPerformanceWidget } from "@/components/dashboard/session-performance-widget";
import { ExposureWidget } from "@/components/dashboard/exposure-widget";
import { CalendarPnlWidget } from "@/components/dashboard/calendar-pnl-widget";
import { Sparkline } from "@/components/dashboard/charts/sparkline";
import type { DashboardTemplate } from "@prisma/client";
import { getDashboardTemplates, createDashboardTemplate, updateDashboardTemplate, deleteDashboardTemplate, setDefaultTemplate, WidgetLayout } from "./template-actions";
import { useLiveStream } from "@/lib/use-live-stream";

// Default template structure
const DEFAULT_LAYOUT: WidgetItem[] = [
  { i: "1", x: 0, y: 0, w: 6, h: 4, type: "equity-hero", config: {} },
  { i: "2", x: 6, y: 0, w: 6, h: 4, type: "agent-feed", config: {} },
  { i: "3", x: 0, y: 4, w: 3, h: 4, type: "risk-heatmap", config: {} },
  { i: "4", x: 3, y: 4, w: 3, h: 4, type: "win-rate", config: {} },
  { i: "5", x: 0, y: 8, w: 6, h: 6, type: "recent-operations", config: {} },
  { i: "6", x: 6, y: 8, w: 6, h: 6, type: "asset-pnl", config: {} },
  { i: "7", x: 6, y: 4, w: 2, h: 4, type: "system-health", config: {} },
  { i: "8", x: 8, y: 4, w: 2, h: 4, type: "market-pulse", config: {} },
  { i: "9", x: 10, y: 4, w: 2, h: 4, type: "quick-actions", config: {} },
];

// Curated starting points a user can apply in edit mode, then save as their own
// template. Keeps a fresh dashboard from feeling empty and shows off the real
// data widgets. Each uses stable ids so react-grid-layout reconciles cleanly.
const PRESET_LAYOUTS: { name: string; layout: WidgetItem[] }[] = [
  {
    name: "Risk Focus",
    layout: [
      { i: "p1", x: 0, y: 0, w: 8, h: 4, type: "equity-hero", config: {} },
      { i: "p2", x: 8, y: 0, w: 4, h: 4, type: "exposure", config: {} },
      { i: "p3", x: 0, y: 4, w: 8, h: 4, type: "drawdown", config: { timeframe: "90" } },
      { i: "p4", x: 8, y: 4, w: 4, h: 4, type: "risk-matrix", config: { groupBy: "asset" } },
      { i: "p5", x: 0, y: 8, w: 6, h: 5, type: "r-distribution", config: {} },
      { i: "p6", x: 6, y: 8, w: 6, h: 5, type: "session-performance", config: {} },
    ],
  },
  {
    name: "Execution Focus",
    layout: [
      { i: "e1", x: 0, y: 0, w: 6, h: 4, type: "equity-hero", config: {} },
      { i: "e2", x: 6, y: 0, w: 6, h: 4, type: "agent-feed", config: {} },
      { i: "e3", x: 0, y: 4, w: 5, h: 5, type: "live-tape", config: { rows: 8 } },
      { i: "e4", x: 5, y: 4, w: 4, h: 5, type: "top-movers", config: {} },
      { i: "e5", x: 9, y: 4, w: 3, h: 5, type: "network-latency", config: {} },
      { i: "e6", x: 0, y: 9, w: 12, h: 6, type: "recent-operations", config: {} },
    ],
  },
];

function EventIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "INFO": return <Info size={14} className="text-fg-subtle" weight="bold" />;
    case "SIGNAL": return <Lightning size={14} className="text-accent" weight="bold" />;
    case "TRADE": return <Target size={14} className="text-profit" weight="bold" />;
    case "RISK": return <WarningOctagon size={14} className="text-warning" weight="bold" />;
    default: return <Heartbeat size={14} className="text-fg-muted" weight="bold" />;
  }
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
  openTrades = [],
  agentEvents = [],
  botStatus = "NONE",
  lastHeartbeat = null,
  accountId = null,
  initialTemplates = [],
  userPlan = "FREE",
  marketAsxEnabled = true
}: {
  balance: number;
  nickname: string;
  avatarUrl: string;
  recent: TradeRow[];
  hasAccount: boolean;
  hasBot: boolean;
  summaries?: DailyRow[];
  trades?: TradeRow[];
  openTrades?: TradeRow[];
  agentEvents?: AgentEventRow[];
  botStatus?: string;
  lastHeartbeat?: string | null;
  accountId?: string | null;
  initialTemplates?: DashboardTemplate[];
  userPlan?: string;
  marketAsxEnabled?: boolean;
}) {

  // State
  const [isEditMode, setIsEditMode] = useState(false);
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(() => {
    if (initialTemplates.length > 0) {
      const defaultTpl = initialTemplates.find(t => t.isDefault);
      return defaultTpl ? defaultTpl.id : initialTemplates[0].id;
    }
    return null;
  });
  const [layoutItems, setLayoutItems] = useState<WidgetItem[]>(() => {
    if (initialTemplates.length > 0) {
      const defaultTpl = initialTemplates.find(t => t.isDefault) || initialTemplates[0];
      return defaultTpl.layout as WidgetItem[];
    }
    return DEFAULT_LAYOUT;
  });

  // Config Dialog
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configWidgetId, setConfigWidgetId] = useState<string | null>(null);

  // Library Dialog
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);

  // New Template Dialog
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  // Plan limit logic
  const PLAN_LIMITS: Record<string, number> = { FREE: 2, TRADER: 3, PRO: 4, ELITE: 5 };
  const limit = PLAN_LIMITS[userPlan] || 2;
  const canCreateTemplate = templates.length < limit;

  // Compute metrics
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todaySummary = summaries.find(s => s.date === todayDateStr);
  const todayPnl = todaySummary?.netPnl ?? 0;

  let engineStatus: "ONLINE" | "DEGRADED" | "OFFLINE" = "OFFLINE";
  if (botStatus === "RUNNING") {
    if (lastHeartbeat) {
      // eslint-disable-next-line react-hooks/purity -- initial estimate only; the SSE stream supersedes this with liveEngineStatus
      const msSinceHeartbeat = Date.now() - new Date(lastHeartbeat).getTime();
      if (msSinceHeartbeat < 60000) engineStatus = "ONLINE";
      else if (msSinceHeartbeat < 300000) engineStatus = "DEGRADED";
      else engineStatus = "OFFLINE";
    } else engineStatus = "OFFLINE";
  }

  let totalWins = 0; let totalTrades = 0;
  for (const s of summaries) { totalWins += s.winCount; totalTrades += s.tradeCount; }
  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;

  // Live stream: real-time feed, balance, position, and engine status without a
  // page refresh. Seeded with the server-rendered props so first paint is full.
  const live = useLiveStream(accountId, Boolean(accountId), {
    events: agentEvents,
    balance,
    botStatus,
  });
  const liveBalance = live.balance ?? balance;
  const liveEvents = live.events.length > 0 ? live.events : agentEvents;
  const liveBotStatus = live.botStatus ?? botStatus;
  const liveEngineStatus = live.engineStatus ?? engineStatus;

  const assetEntries = useMemo(() => {
    const assetPnl = trades.reduce((acc, t) => {
      if (!acc[t.instrument]) acc[t.instrument] = 0;
      if (t.netPnl) acc[t.instrument] += t.netPnl;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(assetPnl).sort((a, b) => b[1] - a[1]);
  }, [trades]);

  // Real execution tape: open fills first, then recent closed trades, newest
  // first. Powers the Execution Tape widget with live data, never a generator.
  const tapeTrades = useMemo(() => [...openTrades, ...trades], [openTrades, trades]);

  // Inline sparkline series for the hero cards (real data from daily summaries).
  const equitySpark = useMemo(
    () => [...summaries].sort((a, b) => a.date.localeCompare(b.date)).map((s) => s.endBalance),
    [summaries],
  );
  const winRateSpark = useMemo(
    () =>
      [...summaries]
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter((s) => s.tradeCount > 0)
        .map((s) => (s.winCount / s.tradeCount) * 100),
    [summaries],
  );

  // Daily net P&L for the Asset P&L "by day" mode (last 14 days, real summaries).
  const dailyEntries = useMemo<[string, number][]>(
    () =>
      [...summaries]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14)
        .map((s) => [s.date.slice(5), s.netPnl] as [string, number]),
    [summaries],
  );

  // Actions
  const handleSaveLayout = async () => {
    if (!activeTemplateId) {
      // First save logic
      setNewTemplateName("My Dashboard");
      setNewTemplateDialogOpen(true);
      return;
    }
    const res = await updateDashboardTemplate(activeTemplateId, layoutItems);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Layout saved");
      setTemplates(templates.map(t => t.id === activeTemplateId ? { ...t, layout: layoutItems } : t));
      setIsEditMode(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return toast.error("Name required");
    const res = await createDashboardTemplate(newTemplateName, layoutItems);
    if (res.error) return toast.error(res.error);
    if (res.data) {
      toast.success("Template created");
      setTemplates([...templates, res.data]);
      setActiveTemplateId(res.data.id);
      setNewTemplateDialogOpen(false);
      setIsEditMode(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const res = await deleteDashboardTemplate(id);
    if (res.success) {
      const newTpls = templates.filter(t => t.id !== id);
      setTemplates(newTpls);
      if (activeTemplateId === id) {
        if (newTpls.length > 0) {
          setActiveTemplateId(newTpls[0].id);
          setLayoutItems(newTpls[0].layout as WidgetItem[]);
        } else {
          setActiveTemplateId(null);
          setLayoutItems(DEFAULT_LAYOUT);
        }
      }
      toast.success("Template deleted");
    }
  };

  const handleSetDefault = async (id: string) => {
    const res = await setDefaultTemplate(id);
    if (res.success) {
      setTemplates(templates.map(t => ({ ...t, isDefault: t.id === id })));
      toast.success("Default template updated");
    }
  };

  // Apply a starting layout (default or a curated preset) into edit mode so the
  // user can tweak then Save it as a template. Never overwrites silently.
  const applyLayout = (layout: WidgetItem[], label: string) => {
    setLayoutItems(layout.map((w) => ({ ...w, config: { ...w.config } })));
    setIsEditMode(true);
    toast.success(`${label} applied. Save to keep it.`);
  };

  const handleLayoutChange = useCallback((newLayout: { i: string; x: number; y: number; w: number; h: number }[]) => {
    setLayoutItems(prev => prev.map(item => {
      const lay = newLayout.find(l => l.i === item.i);
      if (lay) return { ...item, x: lay.x, y: lay.y, w: lay.w, h: lay.h };
      return item;
    }));
  }, []);

  const handleAddWidget = useCallback((type: string) => {
    const newId = `widget_${Date.now()}`;
    const defaultW = 4;
    const defaultH = 4;
    setLayoutItems(prev => [...prev, { i: newId, x: 0, y: Infinity, w: defaultW, h: defaultH, type, config: {} }]);
  }, []);

  const handleRemoveWidget = useCallback((id: string) => {
    setLayoutItems(prev => prev.filter(i => i.i !== id));
  }, []);

  const handleConfigureWidget = useCallback((id: string) => {
    setConfigWidgetId(id);
    setConfigDialogOpen(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveWidgetConfig = useCallback((config: Record<string, any>) => {
    setLayoutItems(prev => prev.map(item => item.i === configWidgetId ? { ...item, config } : item));
  }, [configWidgetId]);

  const renderWidgetContent = useCallback((item: WidgetItem) => {
    // --- Balance & Equity ---
    if (item.type === "equity-hero") {
      const isProfit = todayPnl >= 0;
      return (
        <div className="relative flex h-full w-full flex-col justify-between p-6 overflow-hidden">
          <div className={cn("absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-40 pointer-events-none", isProfit ? "bg-accent/20" : "bg-negative/15")} />
          <div className="relative z-10 flex items-center gap-2 text-fg-subtle">
            <Wallet size={15} weight="fill" className="text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider">Active Capital</span>
          </div>
          <div className="relative z-10 mt-3">
            <span className="text-[34px] font-semibold leading-none tracking-tight text-fg tnum">
              {hasAccount ? <DisplayValue type="BALANCE" money={liveBalance} /> : "$0.00"}
            </span>
          </div>
          {equitySpark.length >= 2 && (
            <div className="relative z-10 mt-3 h-12 w-full">
              <Sparkline values={equitySpark} tone="auto" fill />
            </div>
          )}
          <div className="relative z-10 mt-auto pt-4 flex items-center justify-between border-t border-line/60">
            <span className="text-xs font-medium text-fg-subtle">24h PnL</span>
            <div className="flex items-center gap-1.5">
              {!hasAccount ? <span className="text-sm font-semibold text-fg-subtle">No Account</span>
              : todayPnl === 0 ? <span className="text-sm font-semibold text-fg-subtle">Awaiting Trades</span>
              : <span className={cn("inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1 text-sm font-semibold tnum", isProfit ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative")}>
                  {isProfit ? <TrendUp size={13} weight="bold" /> : <TrendDown size={13} weight="bold" />}
                  <DisplayValue type="PNL" money={todayPnl} percent={liveBalance ? (todayPnl / liveBalance) * 100 : undefined} />
                </span>}
            </div>
          </div>
        </div>
      );
    }

    // --- Live Execution Feed ---
    if (item.type === "agent-feed") {
      const feedLimit = Math.min(30, Math.max(5, Number(item.config.limit) || 10));
      return (
        <div className="relative flex h-full w-full flex-col p-6">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-fg">Live Execution Feed</h3>
              {liveEngineStatus === "DEGRADED" && (
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-warning bg-warning/10 px-1.5 py-0.5 rounded-[4px]">
                  <WarningCircle size={12} weight="fill" /> Degraded
                </span>
              )}
              {live.connected && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">Live</span>
              )}
            </div>
            {hasBot && liveEngineStatus === "ONLINE" && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2">
            {!hasBot ? (
              <div className="flex items-center justify-center h-full"><p className="text-xs text-fg-subtle text-center">Your feed will appear here.</p></div>
            ) : liveEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full"><p className="text-xs text-fg-subtle text-center">Listening...</p></div>
            ) : (
              <div className="flex flex-col gap-3 justify-end min-h-full">
                {liveEvents.slice(-feedLimit).map((event, i) => (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: i * 0.05,
                      ease: [0.23, 1, 0.32, 1] 
                    }}
                    className="flex gap-2 items-start opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <div className="mt-0.5 shrink-0"><EventIcon kind={event.kind} /></div>
                    <div>
                      <p className="text-[11px] font-mono text-fg-faint">{event.t}</p>
                      <p className="text-[11px] text-fg-subtle leading-tight">{event.message}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // --- Risk Heatmap ---
    if (item.type === "risk-heatmap") {
      return (
        <div className="relative flex h-full w-full flex-col p-6">
          <div><h3 className="text-sm font-medium text-fg mb-1">Risk Heatmap</h3><p className="text-xs text-fg-subtle">Drawdown Status</p></div>
          <div className="relative flex flex-col items-center justify-center h-full mt-2">
            <div className="w-full grid grid-cols-7 gap-1 flex-1 opacity-20">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="rounded-sm bg-surface-hover border border-line" />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-fg-subtle font-medium bg-elevated/80 backdrop-blur-sm py-1 px-2 rounded">Awaiting data</p>
            </div>
          </div>
        </div>
      );
    }

    // --- Win Rate Gauge ---
    if (item.type === "win-rate") {
      const dashOffset = winRate ? 251 - (251 * winRate) / 100 : 251;
      const isProfit = winRate && winRate > 50;
      const strokeColor = winRate === null ? "var(--color-surface)" : isProfit ? "var(--color-profit)" : "var(--color-negative)";
      return (
        <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <h3 className="text-sm font-medium text-fg absolute top-4 left-4">Win Rate</h3>
          <div className="relative flex h-24 w-24 items-center justify-center mt-4 shrink-0">
            <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-surface)" strokeWidth="8" />
              {winRate !== null && <circle cx="50" cy="50" r="40" fill="transparent" stroke={strokeColor} strokeWidth="8" strokeDasharray="251" strokeDashoffset={dashOffset} className="transition-all duration-1000 ease-out" />}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {winRate !== null ? (
                <CountUp value={winRate} decimals={1} suffix="%" className="text-xl font-bold text-fg-subtle tnum" />
              ) : (
                <span className="text-xl font-bold text-fg-subtle tnum">N/A</span>
              )}
            </div>
          </div>
          {winRateSpark.length >= 2 && (
            <div className="mt-3 h-8 w-full max-w-[140px]">
              <Sparkline values={winRateSpark} tone={isProfit ? "profit" : "negative"} fill={false} strokeWidth={1.5} />
            </div>
          )}
        </div>
      );
    }

    // --- Recent Operations ---
    if (item.type === "recent-operations") {
      const limit = item.config.limit || 6;
      const filter = item.config.filter || "ALL";
      const filteredTrades = recent.filter(t => {
        const p = (t.netPnl ? Number(t.netPnl) : 0) >= 0;
        if (filter === "WINS") return p;
        if (filter === "LOSSES") return !p;
        return true;
      }).slice(0, Number(limit));

      return (
        <div className="relative flex h-full w-full flex-col p-6">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-sm font-medium text-fg">Recent Operations</h3>
          </div>
          <ul className="flex-1 overflow-y-auto space-y-2 -mx-2 pr-2">
            {filteredTrades.map(trade => {
              const netPnlNum = trade.netPnl ? Number(trade.netPnl) : 0;
              const isProfit = netPnlNum >= 0;
              return (
                <li key={trade.id} className="flex items-center justify-between rounded-[var(--radius-control)] p-2 hover:bg-surface/50">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-[8px]", isProfit ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative")}>
                      {isProfit ? <TrendUp size={16} /> : <TrendDown size={16} />}
                    </div>
                    <div><p className="text-[12px] font-medium text-fg">{trade.direction} {trade.instrument}</p></div>
                  </div>
                  <div className={cn("rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold tnum", isProfit ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative")}>
                    <DisplayValue type="PNL" money={netPnlNum} />
                  </div>
                </li>
              );
            })}
            {filteredTrades.length === 0 && (
              <div className="flex items-center justify-center h-full"><p className="text-xs text-fg-subtle">No recent operations</p></div>
            )}
          </ul>
        </div>
      );
    }

    // --- Asset PnL Breakdown ---
    if (item.type === "asset-pnl") {
      const byDay = item.config?.mode === "day";
      const data = byDay ? dailyEntries : assetEntries;
      return (
        <div className="relative flex h-full w-full flex-col p-6">
          <h3 className="text-sm font-medium text-fg mb-4">{byDay ? "Daily PnL Breakdown" : "Asset PnL Breakdown"}</h3>
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            {data.length === 0 ? (
              <div className="flex items-center justify-center h-full"><p className="text-xs text-fg-subtle text-center">Insufficient Data</p></div>
            ) : (
              <AssetPnlChart data={data} />
            )}
          </div>
        </div>
      );
    }

    // --- System Health ---
    if (item.type === "system-health") {
      return (
        <div className="relative flex h-full w-full flex-col p-5">
          <div className="flex items-center gap-2 mb-4"><Heartbeat size={16} className="text-accent" /><h3 className="text-xs font-medium text-fg">Engine Health</h3></div>
          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-fg-subtle">Bot</span><span className={cn("text-[11px] font-medium", liveBotStatus === "RUNNING" ? "text-profit" : "text-fg-subtle")}>{liveBotStatus}</span></div>
            {liveBotStatus === "RUNNING" && <div className="flex items-center justify-between"><span className="text-[11px] text-fg-subtle">Core</span><span className={cn("flex items-center gap-1 text-[11px] font-medium", liveEngineStatus === "ONLINE" ? "text-profit" : "text-warning")}>{liveEngineStatus}</span></div>}
            <div className="flex items-center justify-between"><span className="text-[11px] text-fg-subtle">API</span><span className="flex items-center gap-1 text-[11px] font-medium text-fg-subtle"><CheckCircle size={12} className={hasAccount ? "text-profit" : ""} />{hasAccount ? "Connected" : "Disconnected"}</span></div>
          </div>
        </div>
      );
    }

    // --- Market Pulse ---
    if (item.type === "market-pulse") {
      return (
        <div className="relative flex h-full w-full flex-col p-5">
          <div className="flex items-center gap-2 mb-4"><ClockCounterClockwise size={16} className="text-accent" /><h3 className="text-xs font-medium text-fg">Next Session</h3></div>
          <div className="mt-auto space-y-2">
            <div>
              <p className="text-[11px] text-fg-subtle mb-1">New York Open</p>
              <div className="flex items-end gap-2"><div className="flex flex-col"><span className="text-xl font-bold text-fg tnum">04</span></div><span className="text-lg font-bold text-line-strong pb-1">:</span><div className="flex flex-col"><span className="text-xl font-bold text-fg tnum">23</span></div></div>
            </div>
            {marketAsxEnabled && (
              <div>
                <p className="text-[11px] text-fg-subtle mb-1">Sydney Open (ASX)</p>
                <div className="flex items-end gap-2"><div className="flex flex-col"><span className="text-xl font-bold text-fg tnum">14</span></div><span className="text-lg font-bold text-line-strong pb-1">:</span><div className="flex flex-col"><span className="text-xl font-bold text-fg tnum">00</span></div></div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // --- Quick Actions ---
    if (item.type === "quick-actions") {
      return (
        <div className="relative flex h-full w-full flex-col p-5">
          <div className="flex items-center gap-2 mb-4"><ArrowUpRight size={16} className="text-accent" /><h3 className="text-xs font-medium text-fg">Quick Actions</h3></div>
          <div className="mt-auto grid grid-cols-2 gap-2 h-full">
            <Link href="/dashboard/bots/new" className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] bg-surface text-[10px] text-fg-subtle hover:bg-surface-hover border border-line"><Robot size={16} />New Bot</Link>
            <Link href="/dashboard/accounts/new" className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] bg-surface text-[10px] text-fg-subtle hover:bg-surface-hover border border-line"><Plug size={16} />Broker</Link>
          </div>
        </div>
      );
    }

    if (item.type === "market-sessions") {
      return <MarketSessionsWidget />;
    }

    if (item.type === "top-movers") {
      return <TopMoversWidget includeAsx={marketAsxEnabled} />;
    }

    if (item.type === "network-latency") {
      return <NetworkLatencyWidget interval={item.config?.interval || "1s"} />;
    }

    if (item.type === "streak-heatmap") {
      return <StreakHeatmapWidget timeframe={item.config?.timeframe || "90"} summaries={summaries} />;
    }

    if (item.type === "live-tape") {
      return <LiveTapeWidget rows={Number(item.config?.rows || "6")} trades={tapeTrades} isLive={live.connected} />;
    }

    if (item.type === "risk-matrix") {
      return <RiskMatrixWidget groupBy={item.config?.groupBy === "direction" ? "direction" : "asset"} openTrades={openTrades} />;
    }

    if (item.type === "drawdown") {
      return <DrawdownWidget summaries={summaries} timeframe={item.config?.timeframe || "90"} />;
    }

    if (item.type === "r-distribution") {
      return <RDistributionWidget trades={trades} />;
    }

    if (item.type === "session-performance") {
      return <SessionPerformanceWidget trades={trades} />;
    }

    if (item.type === "exposure") {
      return <ExposureWidget openTrades={openTrades} balance={liveBalance} />;
    }

    if (item.type === "calendar-pnl") {
      return <CalendarPnlWidget summaries={summaries} />;
    }

    // Fallback
    return <div className="p-6 text-sm text-fg-subtle">Unknown Widget</div>;
  }, [todayPnl, hasAccount, liveBalance, liveEngineStatus, hasBot, liveEvents, live.connected, winRate, recent, assetEntries, liveBotStatus, marketAsxEnabled, summaries, trades, tapeTrades, openTrades, equitySpark, winRateSpark, dailyEntries]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      
      {/* Header Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image src={avatarUrl} alt={nickname} width={40} height={40} className="privacy-blur-avatar rounded-full border border-line object-cover" />
          <h1 className="text-lg font-medium tracking-tight text-fg">Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <Dropdown 
            align="right"
            trigger={
              <button className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface px-4 py-2 text-sm text-fg hover:bg-surface-hover transition-colors font-medium">
                {activeTemplate?.name || "Default Layout"}
                <CaretDown size={14} className="text-fg-subtle" />
              </button>
            }
            items={[
              ...templates.map(t => ({
                label: t.name + (t.isDefault ? " (Default)" : ""),
                onClick: () => {
                  setActiveTemplateId(t.id);
                  setLayoutItems(t.layout as WidgetItem[]);
                  setIsEditMode(false);
                }
              })),
              { label: "divider", onClick: () => {} },
              { label: "Reset to Default Layout", onClick: () => applyLayout(DEFAULT_LAYOUT, "Default layout") },
              ...PRESET_LAYOUTS.map((p) => ({
                label: `Preset: ${p.name}`,
                onClick: () => applyLayout(p.layout, `${p.name} preset`),
              })),
              { label: "divider", onClick: () => {} },
              { label: "Create New Template", onClick: () => {
                if (!canCreateTemplate) return toast.error(`Plan limit reached (${limit}). Upgrade to create more.`);
                setNewTemplateName("");
                setNewTemplateDialogOpen(true);
              }}
            ]}
          />

          {!isEditMode ? (
            <button onClick={() => setIsEditMode(true)} className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-surface border border-line px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-hover">
              <PencilSimple size={16} /> Edit Layout
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => {
                const prev = activeTemplate ? (activeTemplate.layout as WidgetItem[]) : DEFAULT_LAYOUT;
                setLayoutItems(prev);
                setIsEditMode(false);
              }} className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-surface border border-line px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-hover">
                Cancel
              </button>
              <button onClick={handleSaveLayout} className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-medium text-[var(--color-on-accent)] transition-transform hover:scale-[1.02]">
                <Check size={16} weight="bold" /> Save
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditMode && activeTemplate && (
        <div className="flex items-center justify-between p-3 bg-surface/50 border border-line rounded-[var(--radius-card)]">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-fg">Editing: {activeTemplate.name}</span>
            {!activeTemplate.isDefault && (
              <button onClick={() => handleSetDefault(activeTemplate.id)} className="text-xs text-accent hover:underline">Set as Default</button>
            )}
          </div>
          <button onClick={() => handleDeleteTemplate(activeTemplate.id)} className="flex items-center gap-1 text-xs text-negative hover:underline">
            <Trash size={14} /> Delete Template
          </button>
        </div>
      )}

      {/* Grid */}
      <WidgetGrid 
        items={layoutItems} 
        isEditMode={isEditMode}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemoveWidget}
        onConfigureWidget={handleConfigureWidget}
        onAddWidgetRequest={() => setLibraryDialogOpen(true)}
        renderWidget={renderWidgetContent}
      />

      {/* Modals */}
      <WidgetConfigDialog 
        isOpen={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        widgetType={layoutItems.find(i => i.i === configWidgetId)?.type || null}
        config={layoutItems.find(i => i.i === configWidgetId)?.config || {}}
        onSave={handleSaveWidgetConfig}
      />

      <WidgetLibraryDialog 
        isOpen={libraryDialogOpen}
        onClose={() => setLibraryDialogOpen(false)}
        onAdd={handleAddWidget}
      />

      <Dialog isOpen={newTemplateDialogOpen} onClose={() => setNewTemplateDialogOpen(false)} title="Create Layout Template">
        <div className="space-y-4">
          <Label>Template Name</Label>
          <Input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="e.g. Risk Focus" />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setNewTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate}>Create & Save</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
