"use client";

import { useMemo } from "react";

import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { cn, formatUSD } from "@/lib/utils";
import { dailyPnl } from "@/lib/metrics";
import type { DailyRow } from "@/lib/queries";
import { WidgetShell } from "./widget-kit";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Compact current-month P&L calendar. Real data from daily summaries: an
// embeddable version of the full calendar view for the dashboard grid.
export function CalendarPnlWidget({ summaries = [] }: { summaries?: DailyRow[] }) {
  const map = useMemo(() => dailyPnl(summaries), [summaries]);

  const { cells, monthLabel, monthTotal } = useMemo(() => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const first = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const lead = first.getUTCDay();

    const out: ({ day: number; key: string; pnl: number | null } | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10);
      const entry = map.get(key);
      if (entry) total += entry.pnl;
      out.push({ day: d, key, pnl: entry ? entry.pnl : null });
    }
    return {
      cells: out,
      monthLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      monthTotal: total,
    };
  }, [map]);

  const hasData = summaries.length > 0;

  return (
    <WidgetShell
      title={monthLabel}
      icon={<CalendarBlank size={16} weight="duotone" />}
      right={
        hasData ? (
          <span className={cn("tnum text-xs font-medium", monthTotal >= 0 ? "text-profit" : "text-negative")}>
            {monthTotal >= 0 ? "+" : ""}
            {formatUSD(monthTotal).replace(".00", "")}
          </span>
        ) : null
      }
    >
      <div className="flex h-full flex-col px-4 pb-4 pt-2">
        {!hasData ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-xs text-fg-subtle">Daily results fill this calendar in.</p>
          </div>
        ) : (
          <>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="text-center text-[9px] font-semibold uppercase text-fg-faint">{d}</span>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-7 gap-1">
              {cells.map((c, i) =>
                c === null ? (
                  <div key={`pad-${i}`} />
                ) : (
                  <div
                    key={c.key}
                    title={c.pnl == null ? `${c.key}: no session` : `${c.key}: ${formatUSD(c.pnl)}`}
                    className={cn(
                      "flex items-center justify-center rounded-[4px] text-[9px] font-medium tnum transition-colors",
                      c.pnl == null
                        ? "bg-surface/50 text-fg-faint"
                        : c.pnl >= 0
                          ? "bg-profit/15 text-profit"
                          : "bg-negative-soft text-negative",
                    )}
                  >
                    {c.day}
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </div>
    </WidgetShell>
  );
}
