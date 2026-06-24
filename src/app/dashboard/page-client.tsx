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
import { DashboardEmpty, DashboardError } from "@/components/dashboard/states";
import { AssetPnlChart } from "@/components/dashboard/asset-pnl-chart";

import { WidgetGrid, WidgetItem } from "@/components/dashboard/widget-grid";
import { WidgetConfigDialog } from "@/components/dashboard/widget-config-dialog";
import { WidgetLibraryDialog } from "@/components/dashboard/widget-library-dialog";
import { getDashboardTemplates, createDashboardTemplate, updateDashboardTemplate, deleteDashboardTemplate, setDefaultTemplate, WidgetLayout } from "./template-actions";

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
  agentEvents = [],
  botStatus = "NONE",
  lastHeartbeat = null,
  accountId = null,
  initialTemplates = [],
  userPlan = "FREE"
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
  accountId?: string | null;
  initialTemplates?: any[];
  userPlan?: string;
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
      const msSinceHeartbeat = Date.now() - new Date(lastHeartbeat).getTime();
      if (msSinceHeartbeat < 60000) engineStatus = "ONLINE";
      else if (msSinceHeartbeat < 300000) engineStatus = "DEGRADED";
      else engineStatus = "OFFLINE";
    } else engineStatus = "OFFLINE";
  }

  let totalWins = 0; let totalTrades = 0;
  for (const s of summaries) { totalWins += s.winCount; totalTrades += s.tradeCount; }
  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;

  const assetEntries = useMemo(() => {
    const assetPnl = trades.reduce((acc, t) => {
      if (!acc[t.instrument]) acc[t.instrument] = 0;
      if (t.netPnl) acc[t.instrument] += t.netPnl;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(assetPnl).sort((a, b) => b[1] - a[1]);
  }, [trades]);

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

  const handleLayoutChange = useCallback((newLayout: any[]) => {
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

  const handleSaveWidgetConfig = useCallback((config: Record<string, any>) => {
    setLayoutItems(prev => prev.map(item => item.i === configWidgetId ? { ...item, config } : item));
  }, [configWidgetId]);

  const renderWidgetContent = useCallback((item: WidgetItem) => {
    // --- Balance & Equity ---
    if (item.type === "equity-hero") {
      const isProfit = todayPnl >= 0;
      return (
        <div className="relative flex h-full w-full flex-col justify-between p-6">
          <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-60 pointer-events-none", isProfit ? "from-profit/5" : "from-negative/5")} />
          <div className="relative z-10 flex items-start justify-between">
            <span className="text-[28px] font-medium tracking-tight text-fg tnum">
              {hasAccount ? <DisplayValue type="BALANCE" money={balance} /> : "$0.00"}
            </span>
            <span className="text-sm font-medium text-fg-subtle">Active Capital</span>
          </div>
          <div className="relative z-10 mt-auto">
            <p className="text-sm font-medium text-fg-subtle mb-1">24h PnL</p>
            <div className="flex items-center gap-2">
              {!hasAccount ? <span className="text-sm font-semibold text-fg-subtle">No Account</span>
              : todayPnl === 0 ? <span className="text-sm font-semibold text-fg-subtle">Awaiting Trades</span>
              : <span className={cn("text-sm font-semibold tnum", isProfit ? "text-profit" : "text-negative")}><DisplayValue type="PNL" money={todayPnl} percent={balance ? (todayPnl / balance) * 100 : undefined} /></span>}
            </div>
          </div>
        </div>
      );
    }

    // --- Live Execution Feed ---
    if (item.type === "agent-feed") {
      return (
        <div className="relative flex h-full w-full flex-col p-6">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-fg">Live Execution Feed</h3>
              {engineStatus === "DEGRADED" && (
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-warning bg-warning/10 px-1.5 py-0.5 rounded-[4px]">
                  <WarningCircle size={12} weight="fill" /> Degraded
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2">
            {!hasBot ? (
              <div className="flex items-center justify-center h-full"><p className="text-xs text-fg-subtle text-center">Your feed will appear here.</p></div>
            ) : agentEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full"><p className="text-xs text-fg-subtle text-center">Listening...</p></div>
            ) : (
              <div className="flex flex-col gap-3 justify-end min-h-full">
                {agentEvents.slice(0, 10).map((event, i) => (
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
              <span className="text-xl font-bold text-fg-subtle tnum">{winRate !== null ? `${winRate.toFixed(1)}%` : "N/A"}</span>
            </div>
          </div>
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
      return (
        <div className="relative flex h-full w-full flex-col p-6">
          <h3 className="text-sm font-medium text-fg mb-4">Asset PnL Breakdown</h3>
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            {assetEntries.length === 0 ? (
              <div className="flex items-center justify-center h-full"><p className="text-xs text-fg-subtle text-center">Insufficient Data</p></div>
            ) : (
              <AssetPnlChart data={assetEntries} />
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
            <div className="flex items-center justify-between"><span className="text-[11px] text-fg-subtle">Bot</span><span className={cn("text-[11px] font-medium", botStatus === "RUNNING" ? "text-profit" : "text-fg-subtle")}>{botStatus}</span></div>
            {botStatus === "RUNNING" && <div className="flex items-center justify-between"><span className="text-[11px] text-fg-subtle">Core</span><span className={cn("flex items-center gap-1 text-[11px] font-medium", engineStatus === "ONLINE" ? "text-profit" : "text-warning")}>{engineStatus}</span></div>}
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
          <div className="mt-auto"><p className="text-[11px] text-fg-subtle mb-1">New York Open</p><div className="flex items-end gap-2"><div className="flex flex-col"><span className="text-xl font-bold text-fg tnum">04</span></div><span className="text-lg font-bold text-line-strong pb-1">:</span><div className="flex flex-col"><span className="text-xl font-bold text-fg tnum">23</span></div></div></div>
        </div>
      );
    }

    // --- Quick Actions ---
    if (item.type === "quick-actions") {
      return (
        <div className="relative flex h-full w-full flex-col p-5">
          <div className="flex items-center gap-2 mb-4"><ArrowUpRight size={16} className="text-accent" /><h3 className="text-xs font-medium text-fg">Quick Actions</h3></div>
          <div className="mt-auto grid grid-cols-2 gap-2 h-full">
            <Link href="/dashboard/bots/new" className="flex flex-col items-center justify-center gap-1 rounded-md bg-surface text-[10px] text-fg-subtle hover:bg-surface-hover border border-line"><Robot size={16} />New Bot</Link>
            <Link href="/dashboard/accounts/new" className="flex flex-col items-center justify-center gap-1 rounded-md bg-surface text-[10px] text-fg-subtle hover:bg-surface-hover border border-line"><Plug size={16} />Broker</Link>
          </div>
        </div>
      );
    }

    // Fallback
    return <div className="p-6 text-sm text-fg-subtle">Unknown Widget</div>;
  }, [todayPnl, hasAccount, balance, engineStatus, hasBot, agentEvents, winRate, recent, assetEntries, botStatus]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      
      {/* Header Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image src={avatarUrl} alt={nickname} width={40} height={40} className="rounded-full border border-line object-cover" />
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
