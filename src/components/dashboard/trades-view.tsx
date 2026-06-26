"use client";

import { useMemo, useState } from "react";
import { Broadcast, Funnel, Pulse } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import type { TradeRow } from "@/lib/queries";
import { TradesTable } from "@/components/dashboard/trades-table";
import { useLiveStream, type LiveTrade } from "@/lib/use-live-stream";

function liveToRow(t: LiveTrade): TradeRow {
  return {
    id: t.id,
    instrument: t.instrument,
    direction: t.direction as TradeRow["direction"],
    session: "NY",
    status: t.status as TradeRow["status"],
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    stopPrice: 0,
    targetPrice: 0,
    netPnl: t.netPnl,
    grossPnl: null,
    rMultiple: t.rMultiple,
    openedAt: t.openedAt,
    closedAt: t.closedAt,
    narrative: null,
    screenshotUrl: null,
  };
}

export function TradesView({ initialTrades, accountId }: { initialTrades: TradeRow[]; accountId: string | null }) {
  const [liveOn, setLiveOn] = useState(false);
  const [instrument, setInstrument] = useState<string>("ALL");

  // Live view is opt-in and ephemeral: it defaults off and resets on refresh.
  const live = useLiveStream(accountId, liveOn && Boolean(accountId));

  const instruments = useMemo(() => {
    const set = new Set(initialTrades.map((t) => t.instrument));
    return ["ALL", ...Array.from(set).sort()];
  }, [initialTrades]);

  const trades = useMemo(() => {
    if (!liveOn || live.closedTrades.length === 0) return initialTrades;
    // Merge live closed trades over the seed, newest first, deduped by id.
    const byId = new Map<string, TradeRow>();
    for (const t of initialTrades) byId.set(t.id, t);
    for (const t of live.closedTrades) byId.set(t.id, liveToRow(t));
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.closedAt ?? b.openedAt).getTime() - new Date(a.closedAt ?? a.openedAt).getTime(),
    );
  }, [initialTrades, live.closedTrades, liveOn]);

  const filtered = useMemo(
    () => (instrument === "ALL" ? trades : trades.filter((t) => t.instrument === instrument)),
    [trades, instrument],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Instrument filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Funnel size={15} className="shrink-0 text-fg-subtle" />
          {instruments.map((sym) => (
            <button
              key={sym}
              onClick={() => setInstrument(sym)}
              className={cn(
                "shrink-0 rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-medium transition-colors",
                instrument === sym
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line bg-surface text-fg-subtle hover:text-fg hover:bg-surface-hover",
              )}
            >
              {sym === "ALL" ? "All stocks" : sym}
            </button>
          ))}
        </div>

        {/* Live toggle */}
        <button
          onClick={() => setLiveOn((v) => !v)}
          aria-pressed={liveOn}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] border px-3.5 py-2 text-sm font-medium transition-colors",
            liveOn
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-line bg-surface text-fg-subtle hover:text-fg hover:bg-surface-hover",
          )}
        >
          {liveOn ? (
            <span className="relative flex h-2 w-2">
              {live.connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
          ) : (
            <Broadcast size={15} />
          )}
          {liveOn ? (live.connected ? "Live" : "Connecting...") : "Go live"}
        </button>
      </div>

      {/* Open position banner (live only) */}
      {liveOn && live.position && (instrument === "ALL" || live.position.instrument === instrument) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-accent/30 bg-accent-soft/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <Pulse size={18} className="text-accent" />
            <div>
              <p className="text-sm font-semibold text-fg">
                Open {live.position.direction} on {live.position.instrument}
              </p>
              <p className="text-xs text-fg-subtle tnum">
                Entry {live.position.entryPrice.toFixed(2)} · Stop {live.position.stopPrice.toFixed(2)} · Target {live.position.targetPrice.toFixed(2)}
              </p>
            </div>
          </div>
          <span className="rounded-[var(--radius-pill)] bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            In progress
          </span>
        </div>
      )}

      <TradesTable trades={filtered} />

      {filtered.length > 0 && (
        <div className="flex items-center justify-end gap-2 text-xs text-fg-subtle">
          <span>{filtered.length} trades</span>
          <span className="text-fg-faint">·</span>
          <span className="tnum">
            Net <DisplayValue type="PNL" money={filtered.reduce((s, t) => s + (t.netPnl ?? 0), 0)} />
          </span>
        </div>
      )}
    </div>
  );
}
