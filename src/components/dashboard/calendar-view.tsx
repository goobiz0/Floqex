"use client";

import { useState, useMemo } from "react";
import { formatUSD } from "@/lib/utils";
import type { DailyRow, TradeRow } from "@/lib/queries";
import { motion } from "motion/react";

export function CalendarView({ summaries, trades }: { summaries: DailyRow[], trades: TradeRow[] }) {
  const [viewMode, setViewMode] = useState<"DAILY" | "MONTHLY" | "YEARLY">("DAILY");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Daily View: Last 90 days
  const dailyGrid = useMemo(() => {
    const grid = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const summary = summaries.find(s => s.date === dateStr);
      grid.push({ date: dateStr, summary, dateObj: d });
    }
    return grid;
  }, [summaries]);

  // Monthly View
  const monthlyGrid = useMemo(() => {
    const map = new Map<string, { pnl: number, tradeCount: number, monthStr: string }>();
    summaries.forEach(s => {
      const monthKey = s.date.slice(0, 7); // YYYY-MM
      const curr = map.get(monthKey) || { pnl: 0, tradeCount: 0, monthStr: monthKey };
      curr.pnl += s.netPnl;
      curr.tradeCount += s.tradeCount;
      map.set(monthKey, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.monthStr.localeCompare(a.monthStr));
  }, [summaries]);

  // Yearly View
  const yearlyGrid = useMemo(() => {
    const map = new Map<string, { pnl: number, tradeCount: number, yearStr: string }>();
    summaries.forEach(s => {
      const yearKey = s.date.slice(0, 4); // YYYY
      const curr = map.get(yearKey) || { pnl: 0, tradeCount: 0, yearStr: yearKey };
      curr.pnl += s.netPnl;
      curr.tradeCount += s.tradeCount;
      map.set(yearKey, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.yearStr.localeCompare(a.yearStr));
  }, [summaries]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return [];
    return trades.filter(t => t.openedAt.startsWith(selectedDate));
  }, [selectedDate, trades]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-surface p-1 rounded-[var(--radius-pill)] w-fit border border-line">
        {(["DAILY", "MONTHLY", "YEARLY"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => { setViewMode(mode); setSelectedDate(null); }}
            className={`relative px-4 py-1.5 text-xs font-semibold rounded-[var(--radius-pill)] transition-colors ${
              viewMode === mode 
                ? "text-fg" 
                : "text-fg-subtle hover:text-fg"
            }`}
          >
            {viewMode === mode && (
              <motion.div
                layoutId="calendar-tab-pill"
                className="absolute inset-0 rounded-[var(--radius-pill)] bg-base shadow-[var(--shadow-sm)] border border-line"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{mode.charAt(0) + mode.slice(1).toLowerCase()}</span>
          </button>
        ))}
      </div>

      {viewMode === "DAILY" && (
        <div className="grid grid-cols-7 gap-3 sm:gap-4">
          {dailyGrid.map(({ date, summary, dateObj }, i) => {
            const pnl = summary?.netPnl || 0;
            const isToday = dateObj.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
            const isSelected = selectedDate === date;
            
            return (
              <motion.button
                key={date}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.005, ease: "easeOut" }}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                className={`relative flex flex-col p-3 rounded-[var(--radius-card)] border text-left transition-all hover:-translate-y-[1px] active:scale-[0.96] ${
                  isSelected 
                    ? "border-fg bg-surface shadow-[var(--shadow-md)]" 
                    : pnl > 0 
                      ? "border-profit/30 bg-profit/5 hover:border-profit/50" 
                      : pnl < 0 
                        ? "border-negative/30 bg-negative/5 hover:border-negative/50" 
                        : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <span className="text-[10px] font-medium text-fg-subtle uppercase tracking-wider mb-1">
                  {dateObj.toLocaleDateString("en-US", { weekday: "short" })} {dateObj.getDate()}
                </span>
                <span className={`text-sm font-bold ${pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg"}`}>
                  {pnl !== 0 ? formatUSD(pnl) : "$0.00"}
                </span>
                {summary && summary.tradeCount > 0 && (
                  <span className="text-[10px] text-fg-muted mt-1">{summary.tradeCount} trades</span>
                )}
                {isToday && (
                  <span className="absolute -top-1.5 -right-1.5 h-3 w-3 bg-accent rounded-full border-2 border-base" />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {viewMode === "MONTHLY" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {monthlyGrid.map(({ monthStr, pnl, tradeCount }) => {
            const dateObj = new Date(monthStr + "-01");
            return (
              <div key={monthStr} className="relative p-5 rounded-[var(--radius-card)] border border-line bg-surface flex flex-col overflow-hidden group hover:border-line-strong transition-colors">
                <div className={`absolute inset-0 bg-gradient-to-br opacity-10 pointer-events-none transition-opacity group-hover:opacity-20 ${pnl > 0 ? "from-profit to-transparent" : pnl < 0 ? "from-negative to-transparent" : "from-fg-subtle to-transparent"}`} />
                <span className="relative z-10 text-xs font-semibold text-fg-subtle uppercase tracking-widest mb-2">
                  {dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <span className={`relative z-10 text-2xl font-bold tnum ${pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg"}`}>
                  {formatUSD(pnl)}
                </span>
                <span className="relative z-10 text-xs text-fg-muted mt-1">{tradeCount} executed trades</span>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "YEARLY" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {yearlyGrid.map(({ yearStr, pnl, tradeCount }) => (
            <div key={yearStr} className="relative p-6 rounded-[var(--radius-card)] border border-line bg-surface flex flex-col overflow-hidden group hover:border-line-strong transition-colors">
              <div className={`absolute inset-0 bg-gradient-to-br opacity-10 pointer-events-none transition-opacity group-hover:opacity-20 ${pnl > 0 ? "from-profit to-transparent" : pnl < 0 ? "from-negative to-transparent" : "from-fg-subtle to-transparent"}`} />
              <span className="relative z-10 text-sm font-semibold text-fg-subtle uppercase tracking-widest mb-2">
                {yearStr}
              </span>
              <span className={`relative z-10 text-3xl font-bold tnum ${pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg"}`}>
                {formatUSD(pnl)}
              </span>
              <span className="relative z-10 text-sm text-fg-muted mt-2">{tradeCount} executed trades</span>
            </div>
          ))}
        </div>
      )}

      {selectedDate && viewMode === "DAILY" && (
        <div className="mt-8 p-6 rounded-[var(--radius-card)] border border-line bg-surface">
          <h3 className="text-lg font-bold text-fg mb-4">
            Trades on {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h3>
          {selectedDayTrades.length === 0 ? (
            <p className="text-sm text-fg-muted">No trades found for this day.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-line text-fg-subtle">
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Instrument</th>
                    <th className="pb-2 font-medium">Dir</th>
                    <th className="pb-2 font-medium text-right">Entry</th>
                    <th className="pb-2 font-medium text-right">Exit</th>
                    <th className="pb-2 font-medium text-right">Net P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {selectedDayTrades.map(t => (
                    <tr key={t.id}>
                      <td className="py-2 text-fg-muted">{new Date(t.openedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-2 font-medium text-fg">{t.instrument}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${t.direction === "LONG" ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative"}`}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-2 text-right tnum text-fg-subtle">{t.entryPrice.toFixed(2)}</td>
                      <td className="py-2 text-right tnum text-fg-subtle">{t.exitPrice ? t.exitPrice.toFixed(2) : "—"}</td>
                      <td className={`py-2 text-right tnum font-medium ${Number(t.netPnl) > 0 ? "text-profit" : Number(t.netPnl) < 0 ? "text-negative" : "text-fg-subtle"}`}>
                        {formatUSD(Number(t.netPnl))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
