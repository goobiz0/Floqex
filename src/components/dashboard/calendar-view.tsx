"use client";

import { useState, useMemo } from "react";
import { formatUSD } from "@/lib/utils";
import type { DailyRow, TradeRow } from "@/lib/queries";
import { motion, AnimatePresence } from "motion/react";
import { CaretLeft, CaretRight, CalendarBlank, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function CalendarView({ summaries, trades }: { summaries: DailyRow[], trades: TradeRow[] }) {
  const [viewMode, setViewMode] = useState<"DAILY" | "MONTHLY" | "YEARLY">("DAILY");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
    setSelectedDate(null);
  };

  const prevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
    setSelectedDate(null);
  };

  // Generate the days for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
    
    const days = [];
    
    // Empty spacer days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      // pad month and day with 0
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const summary = summaries.find(s => s.date === dateStr);
      days.push({
        dayNumber: i,
        dateStr,
        summary,
        dateObj: new Date(year, month, i)
      });
    }
    
    return days;
  }, [currentMonth, summaries]);

  // Monthly View
  const monthlyGrid = useMemo(() => {
    const map = new Map<string, { pnl: number, tradeCount: number, monthStr: string }>();
    summaries.forEach(s => {
      const monthKey = s.date.slice(0, 7); // YYYY-MM
      const curr = map.get(monthKey) || { pnl: 0, tradeCount: 0, monthStr: monthKey };
      curr.pnl += Number(s.netPnl);
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
      curr.pnl += Number(s.netPnl);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-surface p-1 rounded-[var(--radius-pill)] w-fit border border-line">
          {(["DAILY", "MONTHLY", "YEARLY"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setSelectedDate(null); }}
              className={cn("relative px-4 py-1.5 text-xs font-semibold rounded-[var(--radius-pill)] transition-colors",
                viewMode === mode ? "text-fg" : "text-fg-subtle hover:text-fg"
              )}
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
          <div className="flex items-center gap-4 bg-surface px-2 py-1 rounded-[var(--radius-pill)] border border-line">
            <button onClick={prevMonth} className="p-1.5 text-fg-subtle hover:text-fg hover:bg-base rounded-full transition-colors">
              <CaretLeft size={16} weight="bold" />
            </button>
            <span className="text-sm font-bold w-36 text-center">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button onClick={nextMonth} className="p-1.5 text-fg-subtle hover:text-fg hover:bg-base rounded-full transition-colors">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        )}
      </div>

      {viewMode === "DAILY" && (
        <div className="flex flex-col lg:flex-row gap-6 relative items-start">
          <div className={cn("transition-all duration-500 ease-in-out shrink-0 w-full", selectedDate ? "lg:w-[60%]" : "w-full")}>
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-xs font-bold text-fg-subtle uppercase tracking-widest mb-2">
                  {day}
                </div>
              ))}
              
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`spacer-${i}`} className="min-h-[80px]" />;
                
                const { dateStr, summary, dayNumber } = day;
                const pnl = summary ? Number(summary.netPnl) : 0;
                const isSelected = selectedDate === dateStr;
                
                // Get today string ignoring time zone offset issues by strictly formatting local
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;

                return (
                  <motion.button
                    key={dateStr}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.01, ease: "easeOut" }}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={cn(
                      "relative flex flex-col p-2 sm:p-3 rounded-[var(--radius-control)] border text-left transition-all min-h-[70px] sm:min-h-[90px] hover:-translate-y-0.5 active:scale-95 overflow-hidden",
                      isSelected ? "border-fg bg-surface shadow-[var(--shadow-md)] ring-1 ring-fg z-10" :
                      pnl > 0 ? "border-profit/30 bg-profit/5 hover:border-profit/50" :
                      pnl < 0 ? "border-negative/30 bg-negative/5 hover:border-negative/50" :
                      "border-line bg-surface/50 hover:border-line-strong hover:bg-surface"
                    )}
                  >
                    <span className={cn("text-xs font-bold mb-1", isToday ? "text-accent" : "text-fg-subtle")}>
                      {dayNumber}
                    </span>
                    
                    {summary && summary.tradeCount > 0 ? (
                      <div className="mt-auto w-full">
                        <div className={cn("text-xs sm:text-sm font-bold truncate", pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg")}>
                          {pnl > 0 ? "+" : ""}{formatUSD(pnl)}
                        </div>
                        <div className="text-[10px] text-fg-muted mt-0.5 truncate hidden sm:block">
                          {summary.tradeCount} trade{summary.tradeCount > 1 ? "s" : ""}
                        </div>
                      </div>
                    ) : null}

                    {isToday && (
                      <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full shadow-[0_0_8px_var(--color-accent)]" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "100%" }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="lg:w-[40%] shrink-0 lg:sticky lg:top-6 overflow-hidden"
              >
                <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-lg)] min-w-[300px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-fg">
                        {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      </h3>
                      <p className="text-xs text-fg-subtle mt-1">Daily Overview</p>
                    </div>
                    <button 
                      onClick={() => setSelectedDate(null)}
                      className="p-1.5 text-fg-subtle hover:text-fg hover:bg-base rounded-md transition-colors"
                    >
                      <X size={18} weight="bold" />
                    </button>
                  </div>

                  {selectedDayTrades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarBlank size={32} className="text-fg-faint mb-3" />
                      <p className="text-sm font-medium text-fg">No trading activity</p>
                      <p className="text-xs text-fg-subtle mt-1">There were no trades executed on this day.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Daily Metrics Summary */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-3 rounded-lg border border-line bg-base">
                          <p className="text-xs text-fg-subtle mb-1">Total P/L</p>
                          <p className={cn("text-lg font-bold", 
                            selectedDayTrades.reduce((acc, t) => acc + Number(t.netPnl), 0) > 0 ? "text-profit" : 
                            selectedDayTrades.reduce((acc, t) => acc + Number(t.netPnl), 0) < 0 ? "text-negative" : "text-fg"
                          )}>
                            {formatUSD(selectedDayTrades.reduce((acc, t) => acc + Number(t.netPnl), 0))}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border border-line bg-base">
                          <p className="text-xs text-fg-subtle mb-1">Trades</p>
                          <p className="text-lg font-bold text-fg">{selectedDayTrades.length}</p>
                        </div>
                      </div>

                      {/* Trade List */}
                      <h4 className="text-sm font-semibold text-fg border-b border-line pb-2 mb-3">Executed Trades</h4>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedDayTrades.map(t => {
                          const pnl = Number(t.netPnl);
                          return (
                            <div key={t.id} className="p-3 rounded-lg border border-line bg-base hover:border-line-strong transition-colors flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-sm text-fg">{t.instrument}</span>
                                  <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm tracking-wider",
                                    t.direction === "LONG" ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative"
                                  )}>
                                    {t.direction}
                                  </span>
                                </div>
                                <div className="text-xs text-fg-subtle flex items-center gap-2">
                                  <span>{new Date(t.openedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                  <span className="w-1 h-1 rounded-full bg-line-strong" />
                                  <span>{t.session}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={cn("font-bold text-sm tnum", pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg")}>
                                  {pnl > 0 ? "+" : ""}{formatUSD(pnl)}
                                </div>
                                <div className="text-xs text-fg-subtle tnum mt-0.5">
                                  {t.entryPrice.toFixed(2)} → {t.exitPrice ? t.exitPrice.toFixed(2) : "Open"}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {viewMode === "MONTHLY" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {monthlyGrid.map(({ monthStr, pnl, tradeCount }) => {
            const dateObj = new Date(monthStr + "-01T12:00:00");
            return (
              <div key={monthStr} className="relative p-6 rounded-[var(--radius-card)] border border-line bg-surface flex flex-col overflow-hidden group hover:border-line-strong transition-colors hover:-translate-y-0.5">
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 pointer-events-none transition-opacity group-hover:opacity-10",
                  pnl > 0 ? "from-profit to-transparent" : pnl < 0 ? "from-negative to-transparent" : "from-fg-subtle to-transparent"
                )} />
                <span className="relative z-10 text-xs font-bold text-fg-subtle uppercase tracking-widest mb-3">
                  {dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <span className={cn("relative z-10 text-3xl font-bold tnum tracking-tight mb-1", 
                  pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg"
                )}>
                  {formatUSD(pnl)}
                </span>
                <span className="relative z-10 text-xs font-medium text-fg-muted mt-auto pt-4 flex items-center justify-between border-t border-line/50">
                  <span>Total Trades</span>
                  <span className="text-fg">{tradeCount}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "YEARLY" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {yearlyGrid.map(({ yearStr, pnl, tradeCount }) => (
            <div key={yearStr} className="relative p-8 rounded-[var(--radius-card)] border border-line bg-surface flex flex-col overflow-hidden group hover:border-line-strong transition-colors hover:-translate-y-1">
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 pointer-events-none transition-opacity group-hover:opacity-10",
                pnl > 0 ? "from-profit to-transparent" : pnl < 0 ? "from-negative to-transparent" : "from-fg-subtle to-transparent"
              )} />
              <span className="relative z-10 text-sm font-bold text-fg-subtle uppercase tracking-widest mb-4">
                {yearStr}
              </span>
              <span className={cn("relative z-10 text-4xl font-bold tnum tracking-tight mb-2", 
                pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg"
              )}>
                {formatUSD(pnl)}
              </span>
              <span className="relative z-10 text-sm font-medium text-fg-muted mt-auto pt-6 flex items-center justify-between border-t border-line/50">
                <span>Total Executed Trades</span>
                <span className="text-fg">{tradeCount}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
