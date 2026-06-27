"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { WIDGET_DIMENSIONS } from "./widget-grid";
import { Input } from "@/components/ui/input";
import { Plus, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

type WidgetMeta = {
  type: string;
  name: string;
  desc: string;
  category: "Performance" | "Activity" | "Markets" | "Utility";
  keywords: string;
  pro?: boolean;
};

const AVAILABLE_WIDGETS: WidgetMeta[] = [
  { type: "equity-hero", name: "Balance & Equity", desc: "Hero view of active capital and daily PnL.", category: "Performance", keywords: "balance equity capital pnl profit money hero" },
  { type: "win-rate", name: "Win Rate Gauge", desc: "Circular gauge of recent operation success.", category: "Performance", keywords: "win rate gauge success ratio percentage" },
  { type: "asset-pnl", name: "Asset PnL Breakdown", desc: "Bar chart of net PnL by instrument.", category: "Performance", keywords: "asset pnl breakdown chart instrument symbol bar" },
  { type: "risk-heatmap", name: "Risk Heatmap", desc: "Visual grid of daily drawdown status.", category: "Performance", keywords: "risk heatmap drawdown loss exposure grid" },
  { type: "agent-feed", name: "Live Execution Feed", desc: "Real-time feed of bot actions and alerts.", category: "Activity", keywords: "feed live execution bot actions alerts stream events" },
  { type: "recent-operations", name: "Recent Operations", desc: "List of the most recent closed trades.", category: "Activity", keywords: "recent operations trades history closed list" },
  { type: "market-pulse", name: "Market Pulse", desc: "Countdown to next major session open.", category: "Markets", keywords: "market pulse session open countdown nyse asx clock" },
  { type: "system-health", name: "Engine Health", desc: "Core latency and bot connection status.", category: "Utility", keywords: "system health engine latency status connection api", pro: true },
  { type: "quick-actions", name: "Quick Actions", desc: "Shortcut buttons for new bot, broker, etc.", category: "Utility", keywords: "quick actions shortcuts new bot broker buttons" },
  { type: "market-sessions", name: "World Clock", desc: "Live market session times across major hubs.", category: "Markets", keywords: "market sessions world clock hours time open closed", pro: true },
  { type: "top-movers", name: "Top Movers", desc: "Top gaining and losing assets by percentage.", category: "Markets", keywords: "top movers gainers losers volume price change", pro: true },
  { type: "network-latency", name: "Network Ping", desc: "Live broker API latency visualization.", category: "Utility", keywords: "network ping latency broker speed api chart" },
  { type: "streak-heatmap", name: "Trading Streak", desc: "Daily PnL consistency contribution graph.", category: "Performance", keywords: "streak heatmap consistency pnl daily graph" },
  { type: "live-tape", name: "Execution Tape", desc: "Live feed of your bot's most recent fills.", category: "Activity", keywords: "order book tape live executions fills ticker" },
  { type: "risk-matrix", name: "Risk Exposure", desc: "Capital at risk across open positions.", category: "Markets", keywords: "risk matrix exposure capital open positions donut chart", pro: true },
];

const CATEGORY_ORDER: WidgetMeta["category"][] = ["Performance", "Activity", "Markets", "Utility"];

export function WidgetLibraryDialog({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (type: string) => void }) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AVAILABLE_WIDGETS;
    return AVAILABLE_WIDGETS.filter((w) =>
      `${w.name} ${w.desc} ${w.keywords} ${w.category}`.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(
    () => CATEGORY_ORDER.map((cat) => ({ cat, items: matches.filter((w) => w.category === cat) })).filter((g) => g.items.length > 0),
    [matches],
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Widget Library">
      <div className="space-y-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search widgets"
          icon={<MagnifyingGlass />}
          aria-label="Search widgets"
          autoFocus
        />

        {matches.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface/30 p-10 text-center">
            <p className="text-sm font-medium text-fg-muted">No widgets match &ldquo;{query}&rdquo;</p>
            <p className="mt-1 text-xs text-fg-subtle">Try a different term, or clear the search.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto p-1">
            {grouped.map(({ cat, items }) => (
              <section key={cat} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{cat}</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {items.map((w) => {
                    const dim = WIDGET_DIMENSIONS[w.type] || { minW: 2, minH: 2 };
                    return (
                      <button
                        key={w.type}
                        type="button"
                        onClick={() => { onAdd(w.type); onClose(); }}
                        className="group flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left transition-colors hover:border-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-medium text-fg">{w.name}</h5>
                            {w.pro && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-accent">Pro</span>}
                          </div>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-[var(--color-on-accent)]">
                            <Plus size={14} weight="bold" />
                          </span>
                        </div>
                        <p className="mb-3 text-xs text-fg-subtle">{w.desc}</p>
                        <span className="tnum mt-auto w-fit rounded border border-line bg-base px-1.5 py-0.5 font-mono text-[10px] text-fg-faint">
                          Min {dim.minW}x{dim.minH}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
