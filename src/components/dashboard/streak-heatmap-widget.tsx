"use client";

import { useMemo } from "react";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { cn, formatUSD } from "@/lib/utils";
import type { DailyRow } from "@/lib/queries";
import { WidgetShell } from "./widget-kit";

// Real daily P&L consistency grid. Each cell is one calendar day over the
// lookback, coloured by that day's net P&L from the account's daily summaries.
// Weekends (no session) render dimmed and neutral. No fabricated data.
export function StreakHeatmapWidget({
  timeframe = "90",
  summaries = [],
}: {
  timeframe?: string;
  summaries?: DailyRow[];
}) {
  const days = parseInt(timeframe, 10) || 90;

  const byDate = useMemo(() => {
    const m = new Map<string, DailyRow>();
    for (const s of summaries) m.set(s.date, s);
    return m;
  }, [summaries]);

  const cells = useMemo(() => {
    // Magnitude scale relative to the largest absolute day in the window so the
    // intensity is meaningful for both a $50 scalper and a $5k swing account.
    const arr: { date: string; pnl: number | null; count: number; isWeekend: boolean }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const day = d.getUTCDay();
      const row = byDate.get(key);
      arr.push({
        date: key,
        pnl: row ? row.netPnl : null,
        count: row ? row.tradeCount : 0,
        isWeekend: day === 0 || day === 6,
      });
    }
    return arr;
  }, [days, byDate]);

  const maxAbs = useMemo(() => {
    let max = 0;
    for (const c of cells) if (c.pnl != null) max = Math.max(max, Math.abs(c.pnl));
    return max;
  }, [cells]);

  const hasData = summaries.length > 0;

  function colorFor(pnl: number | null): string {
    if (pnl == null || pnl === 0 || maxAbs === 0) return "bg-surface";
    const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
    if (pnl > 0) return intensity > 0.66 ? "bg-profit" : intensity > 0.33 ? "bg-profit/70" : "bg-profit/40";
    return intensity > 0.5 ? "bg-negative/80" : "bg-negative/50";
  }

  return (
    <WidgetShell
      title="Trading Streak"
      icon={<CalendarBlank size={16} weight="duotone" />}
      right={<span className="text-xs text-fg-subtle">{days} Days</span>}
    >
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-4">
        {!hasData ? (
          <p className="text-center text-xs text-fg-subtle">Your trading days fill in here once your account has daily results.</p>
        ) : (
          <div className="flex h-full w-full max-w-[400px] flex-wrap content-center justify-center gap-1">
            {cells.map((c) => (
              <div
                key={c.date}
                className={cn(
                  "h-3 w-3 rounded-[2px] transition-colors hover:ring-1 hover:ring-fg",
                  colorFor(c.pnl),
                  c.isWeekend && c.pnl == null && "opacity-20",
                )}
                title={
                  c.pnl == null
                    ? `${c.date}: no session`
                    : `${c.date}: ${formatUSD(c.pnl)} over ${c.count} trade${c.count === 1 ? "" : "s"}`
                }
              />
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
