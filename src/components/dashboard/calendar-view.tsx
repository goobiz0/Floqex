"use client";

import { useState, useMemo } from "react";
import { DisplayValue } from "@/components/ui/display-value";
import type { DailyRow, TradeRow } from "@/lib/queries";
import { motion, AnimatePresence } from "motion/react";
import { CaretLeft, CaretRight, CalendarBlank, X, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type ViewMode = "DAILY" | "MONTHLY" | "YEARLY";

export function CalendarView({ summaries, trades }: { summaries: DailyRow[]; trades: TradeRow[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("DAILY");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Drill-down selections for the Monthly and Yearly views, mirroring the Daily
  // view's click-to-detail interaction.
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const clearSelections = () => {
    setSelectedDate(null);
    setSelectedMonth(null);
    setSelectedYear(null);
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + delta);
    setCurrentMonth(next);
    clearSelections();
  };

  const shiftYear = (delta: number) => {
    const next = new Date(currentMonth);
    next.setFullYear(next.getFullYear() + delta);
    setCurrentMonth(next);
    clearSelections();
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setCurrentMonth(d);
    clearSelections();
  };

  // Days for the current month (with leading spacers so weekdays line up).
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();

    const days: ({ dayNumber: number; dateStr: string; summary?: DailyRow } | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ dayNumber: i, dateStr, summary: summaries.find((s) => s.date === dateStr) });
    }
    return days;
  }, [currentMonth, summaries]);

  // All 12 months of the viewed year, so the Monthly view is always populated.
  const monthlyForYear = useMemo(() => {
    const year = currentMonth.getFullYear();
    const totals = new Map<number, { pnl: number; tradeCount: number }>();
    for (const s of summaries) {
      if (s.date.slice(0, 4) !== String(year)) continue;
      const m = Number(s.date.slice(5, 7)) - 1;
      const cur = totals.get(m) ?? { pnl: 0, tradeCount: 0 };
      cur.pnl += Number(s.netPnl);
      cur.tradeCount += s.tradeCount;
      totals.set(m, cur);
    }
    return Array.from({ length: 12 }, (_, m) => ({
      month: m,
      label: new Date(year, m, 1).toLocaleDateString("en-US", { month: "long" }),
      pnl: totals.get(m)?.pnl ?? 0,
      tradeCount: totals.get(m)?.tradeCount ?? 0,
    }));
  }, [summaries, currentMonth]);

  const yearTotal = useMemo(
    () => monthlyForYear.reduce((acc, m) => ({ pnl: acc.pnl + m.pnl, tradeCount: acc.tradeCount + m.tradeCount }), { pnl: 0, tradeCount: 0 }),
    [monthlyForYear],
  );

  // Every year that has activity, plus the current year so the view is never blank.
  const yearlyGrid = useMemo(() => {
    const map = new Map<string, { pnl: number; tradeCount: number }>();
    for (const s of summaries) {
      const y = s.date.slice(0, 4);
      const cur = map.get(y) ?? { pnl: 0, tradeCount: 0 };
      cur.pnl += Number(s.netPnl);
      cur.tradeCount += s.tradeCount;
      map.set(y, cur);
    }
    const cy = String(new Date().getFullYear());
    if (!map.has(cy)) map.set(cy, { pnl: 0, tradeCount: 0 });
    return Array.from(map.entries())
      .map(([yearStr, v]) => ({ yearStr, ...v }))
      .sort((a, b) => b.yearStr.localeCompare(a.yearStr));
  }, [summaries]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return [];
    return trades.filter((t) => t.openedAt.startsWith(selectedDate));
  }, [selectedDate, trades]);

  // Active days within the selected month, for the Monthly detail panel.
  const selectedMonthDays = useMemo(() => {
    if (selectedMonth === null) return [];
    const year = currentMonth.getFullYear();
    const prefix = `${year}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return summaries
      .filter((s) => s.date.startsWith(prefix) && s.tradeCount > 0)
      .map((s) => ({ dateStr: s.date, pnl: Number(s.netPnl), tradeCount: s.tradeCount, startBalance: s.startBalance }))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [selectedMonth, currentMonth, summaries]);

  const selectedMonthMeta = useMemo(() => {
    if (selectedMonth === null) return null;
    const row = monthlyForYear.find((m) => m.month === selectedMonth);
    return {
      label: new Date(currentMonth.getFullYear(), selectedMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      pnl: row?.pnl ?? 0,
      tradeCount: row?.tradeCount ?? 0,
    };
  }, [selectedMonth, currentMonth, monthlyForYear]);

  // Per-month breakdown within the selected year, for the Yearly detail panel.
  const selectedYearMonths = useMemo(() => {
    if (!selectedYear) return [];
    const totals = new Map<number, { pnl: number; tradeCount: number }>();
    for (const s of summaries) {
      if (s.date.slice(0, 4) !== selectedYear) continue;
      const m = Number(s.date.slice(5, 7)) - 1;
      const cur = totals.get(m) ?? { pnl: 0, tradeCount: 0 };
      cur.pnl += Number(s.netPnl);
      cur.tradeCount += s.tradeCount;
      totals.set(m, cur);
    }
    return Array.from(totals.entries())
      .map(([month, v]) => ({
        month,
        label: new Date(Number(selectedYear), month, 1).toLocaleDateString("en-US", { month: "long" }),
        ...v,
      }))
      .filter((m) => m.tradeCount > 0)
      .sort((a, b) => a.month - b.month);
  }, [selectedYear, summaries]);

  const selectedYearMeta = useMemo(() => {
    if (!selectedYear) return null;
    const row = yearlyGrid.find((y) => y.yearStr === selectedYear);
    return { pnl: row?.pnl ?? 0, tradeCount: row?.tradeCount ?? 0 };
  }, [selectedYear, yearlyGrid]);

  // Jump from a Monthly day cell into the Daily view for that exact date.
  const openDayFromMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setCurrentMonth(d);
    setSelectedMonth(null);
    setSelectedDate(dateStr);
    setViewMode("DAILY");
  };

  // Jump from a Yearly month cell into the Monthly view for that month.
  const openMonthFromYear = (month: number) => {
    const d = new Date(Number(selectedYear), month, 1);
    d.setHours(0, 0, 0, 0);
    setCurrentMonth(d);
    setSelectedYear(null);
    setSelectedMonth(month);
    setViewMode("MONTHLY");
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const pnlTone = (pnl: number) => (pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg");

  return (
    <div className="space-y-6">
      {/* Toolbar: view switch + period navigator */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1">
          {(["DAILY", "MONTHLY", "YEARLY"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); clearSelections(); }}
              className={cn(
                "relative rounded-[var(--radius-pill)] px-4 py-1.5 text-xs font-semibold transition-colors",
                viewMode === mode ? "text-fg" : "text-fg-subtle hover:text-fg",
              )}
            >
              {viewMode === mode && (
                <motion.div
                  layoutId="calendar-tab-pill"
                  className="absolute inset-0 rounded-[var(--radius-pill)] border border-line bg-base shadow-[var(--shadow-sm)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{mode.charAt(0) + mode.slice(1).toLowerCase()}</span>
            </button>
          ))}
        </div>

        {viewMode === "DAILY" && (
          <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1">
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded-[var(--radius-pill)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">
              <CaretLeft size={16} weight="bold" />
            </button>
            <button onClick={goToToday} className="w-36 rounded-[var(--radius-pill)] py-1 text-center text-sm font-bold text-fg transition-colors hover:bg-base hover:text-accent">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </button>
            <button onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-[var(--radius-pill)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        )}

        {viewMode === "MONTHLY" && (
          <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1">
            <button onClick={() => shiftYear(-1)} aria-label="Previous year" className="rounded-[var(--radius-pill)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">
              <CaretLeft size={16} weight="bold" />
            </button>
            <span className="w-20 text-center text-sm font-bold text-fg tnum">{currentMonth.getFullYear()}</span>
            <button onClick={() => shiftYear(1)} aria-label="Next year" className="rounded-[var(--radius-pill)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        )}
      </div>

      {/* DAILY */}
      {viewMode === "DAILY" && (
        <div className={cn("grid items-start gap-6", selectedDate ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1")}>
          <div className="min-w-0">
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="mb-1 text-center text-xs font-bold uppercase tracking-widest text-fg-subtle">
                  {day}
                </div>
              ))}

              {calendarDays.map((day, i) => {
                if (!day) return <div key={`spacer-${i}`} className="min-h-[70px]" />;
                const { dateStr, summary, dayNumber } = day;
                const pnl = summary ? Number(summary.netPnl) : 0;
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr;

                return (
                  <motion.button
                    key={dateStr}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.008, 0.2), ease: "easeOut" }}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={cn(
                      "relative flex min-h-[70px] flex-col overflow-hidden rounded-[var(--radius-control)] border p-2 text-left transition-all hover:-translate-y-0.5 active:scale-95 sm:min-h-[90px] sm:p-3",
                      isSelected
                        ? "border-fg bg-surface shadow-[var(--shadow-md)] ring-1 ring-fg z-10"
                        : summary && summary.tradeCount > 0
                          ? pnl > 0
                            ? "border-profit/30 bg-profit/5 hover:border-profit/50"
                            : pnl < 0
                              ? "border-negative/30 bg-negative/5 hover:border-negative/50"
                              : "border-line bg-surface/50 hover:border-line-strong hover:bg-surface"
                          : "border-line bg-surface/50 hover:border-line-strong hover:bg-surface",
                    )}
                  >
                    <span className={cn("mb-1 text-xs font-bold", isToday ? "text-accent" : "text-fg-subtle")}>{dayNumber}</span>

                    {summary && summary.tradeCount > 0 ? (
                      <div className="mt-auto w-full">
                        <div className={cn("truncate text-xs font-bold sm:text-sm", pnlTone(pnl))}>
                          <DisplayValue type="PNL" money={pnl} percent={summary.startBalance ? (pnl / summary.startBalance) * 100 : undefined} />
                        </div>
                        <div className="mt-0.5 hidden truncate text-[10px] text-fg-muted sm:block">
                          {summary.tradeCount} trade{summary.tradeCount > 1 ? "s" : ""}
                        </div>
                      </div>
                    ) : null}

                    {isToday && <span className="absolute right-2 top-2 h-2 w-2 rounded-[var(--radius-pill)] bg-accent shadow-[0_0_8px_var(--color-accent)]" />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedDate && (
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="min-w-0 lg:sticky lg:top-6"
              >
                <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-lg)]">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-fg">
                        {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      </h3>
                      <p className="mt-1 text-xs text-fg-subtle">Daily overview</p>
                    </div>
                    <button onClick={() => setSelectedDate(null)} aria-label="Close" className="rounded-[var(--radius-control)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">
                      <X size={18} weight="bold" />
                    </button>
                  </div>

                  {selectedDayTrades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarBlank size={32} className="mb-3 text-fg-faint" />
                      <p className="text-sm font-medium text-fg">No trading activity</p>
                      <p className="mt-1 text-xs text-fg-subtle">There were no trades executed on this day.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[var(--radius-control)] border border-line bg-base p-3">
                          <p className="mb-1 text-xs text-fg-subtle">Total P/L</p>
                          <p className={cn("text-lg font-bold tnum", pnlTone(selectedDayTrades.reduce((acc, t) => acc + Number(t.netPnl ?? 0), 0)))}>
                            <DisplayValue type="PNL" money={selectedDayTrades.reduce((acc, t) => acc + Number(t.netPnl ?? 0), 0)} />
                          </p>
                        </div>
                        <div className="rounded-[var(--radius-control)] border border-line bg-base p-3">
                          <p className="mb-1 text-xs text-fg-subtle">Trades</p>
                          <p className="text-lg font-bold text-fg tnum">{selectedDayTrades.length}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-3 border-b border-line pb-2 text-sm font-semibold text-fg">Executed trades</h4>
                        <div className="custom-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
                          {selectedDayTrades.map((t) => {
                            const pnl = Number(t.netPnl ?? 0);
                            const isLong = t.direction === "LONG";
                            return (
                              <div key={t.id} className="flex items-center justify-between rounded-[var(--radius-control)] border border-line bg-base p-3 transition-colors hover:border-line-strong">
                                <div className="min-w-0">
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="truncate text-sm font-bold text-fg">{t.instrument}</span>
                                    <span className={cn("inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", isLong ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative")}>
                                      {isLong ? <ArrowUp size={9} weight="bold" /> : <ArrowDown size={9} weight="bold" />}
                                      {t.direction}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-fg-subtle">
                                    <span className="tnum">{new Date(t.openedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                    <span className="h-1 w-1 rounded-[var(--radius-pill)] bg-line-strong" />
                                    <span>{t.session}</span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className={cn("text-sm font-bold tnum", pnlTone(pnl))}>
                                    <DisplayValue type="PNL" money={pnl} />
                                  </div>
                                  <div className="mt-0.5 text-xs text-fg-subtle tnum">
                                    {t.entryPrice.toFixed(2)} {"->"} {t.exitPrice ? t.exitPrice.toFixed(2) : "Open"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* MONTHLY */}
      {viewMode === "MONTHLY" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{currentMonth.getFullYear()} total</p>
              <p className={cn("mt-1 text-2xl font-bold tnum tracking-tight", pnlTone(yearTotal.pnl))}>
                <DisplayValue type="PNL" money={yearTotal.pnl} />
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-fg-subtle">Trades this year</p>
              <p className="mt-1 text-lg font-semibold text-fg tnum">{yearTotal.tradeCount}</p>
            </div>
          </div>

          <div className={cn("grid items-start gap-6", selectedMonth !== null ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1")}>
            <div className="min-w-0">
              <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", selectedMonth === null && "lg:grid-cols-3")}>
                {monthlyForYear.map(({ month, label, pnl, tradeCount }, i) => {
                  const active = tradeCount > 0;
                  const isSelected = selectedMonth === month;
                  return (
                    <motion.button
                      key={month}
                      type="button"
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2), ease: "easeOut" }}
                      onClick={() => setSelectedMonth(isSelected ? null : month)}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface p-6 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98]",
                        isSelected
                          ? "border-fg shadow-[var(--shadow-md)] ring-1 ring-fg z-10"
                          : active
                            ? "border-line hover:border-line-strong"
                            : "border-line/60",
                      )}
                    >
                      {active && (
                        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-5 transition-opacity group-hover:opacity-10", pnl > 0 ? "from-profit to-transparent" : pnl < 0 ? "from-negative to-transparent" : "from-fg-subtle to-transparent")} />
                      )}
                      <span className="relative z-10 mb-3 text-xs font-bold uppercase tracking-widest text-fg-subtle">{label}</span>
                      <span className={cn("relative z-10 mb-1 text-3xl font-bold tracking-tight tnum", active ? pnlTone(pnl) : "text-fg-faint")}>
                        {active ? <DisplayValue type="PNL" money={pnl} /> : "$0.00"}
                      </span>
                      <span className="relative z-10 mt-auto flex items-center justify-between border-t border-line/50 pt-4 text-xs font-medium text-fg-muted">
                        <span>Trades</span>
                        <span className={active ? "text-fg" : "text-fg-faint"}>{tradeCount}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedMonth !== null && selectedMonthMeta && (
                <motion.div
                  key={selectedMonth}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="min-w-0 lg:sticky lg:top-6"
                >
                  <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-lg)]">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-fg">{selectedMonthMeta.label}</h3>
                        <p className="mt-1 text-xs text-fg-subtle">Monthly overview</p>
                      </div>
                      <button onClick={() => setSelectedMonth(null)} aria-label="Close" className="rounded-[var(--radius-control)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">
                        <X size={18} weight="bold" />
                      </button>
                    </div>

                    {selectedMonthDays.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CalendarBlank size={32} className="mb-3 text-fg-faint" />
                        <p className="text-sm font-medium text-fg">No trading activity</p>
                        <p className="mt-1 text-xs text-fg-subtle">There were no trades executed this month.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-[var(--radius-control)] border border-line bg-base p-3">
                            <p className="mb-1 text-xs text-fg-subtle">Total P/L</p>
                            <p className={cn("text-lg font-bold tnum", pnlTone(selectedMonthMeta.pnl))}>
                              <DisplayValue type="PNL" money={selectedMonthMeta.pnl} />
                            </p>
                          </div>
                          <div className="rounded-[var(--radius-control)] border border-line bg-base p-3">
                            <p className="mb-1 text-xs text-fg-subtle">Trades</p>
                            <p className="text-lg font-bold text-fg tnum">{selectedMonthMeta.tradeCount}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-3 border-b border-line pb-2 text-sm font-semibold text-fg">Active days</h4>
                          <div className="custom-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
                            {selectedMonthDays.map((d) => (
                              <button
                                key={d.dateStr}
                                onClick={() => openDayFromMonth(d.dateStr)}
                                className="flex w-full items-center justify-between rounded-[var(--radius-control)] border border-line bg-base p-3 text-left transition-colors hover:border-line-strong"
                              >
                                <div className="min-w-0">
                                  <span className="block text-sm font-bold text-fg">
                                    {new Date(d.dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                  </span>
                                  <span className="text-xs text-fg-subtle">{d.tradeCount} trade{d.tradeCount > 1 ? "s" : ""}</span>
                                </div>
                                <div className={cn("shrink-0 text-sm font-bold tnum", pnlTone(d.pnl))}>
                                  <DisplayValue type="PNL" money={d.pnl} percent={d.startBalance ? (d.pnl / d.startBalance) * 100 : undefined} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* YEARLY */}
      {viewMode === "YEARLY" && (
        <div className={cn("grid items-start gap-6", selectedYear !== null ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1")}>
          <div className="min-w-0">
            <div className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2", selectedYear === null && "lg:grid-cols-3")}>
              {yearlyGrid.map(({ yearStr, pnl, tradeCount }, i) => {
                const active = tradeCount > 0;
                const isSelected = selectedYear === yearStr;
                return (
                  <motion.button
                    key={yearStr}
                    type="button"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2), ease: "easeOut" }}
                    onClick={() => setSelectedYear(isSelected ? null : yearStr)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface p-8 text-left transition-all hover:-translate-y-1 active:scale-[0.98]",
                      isSelected ? "border-fg shadow-[var(--shadow-md)] ring-1 ring-fg z-10" : "border-line hover:border-line-strong",
                    )}
                  >
                    {active && (
                      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-5 transition-opacity group-hover:opacity-10", pnl > 0 ? "from-profit to-transparent" : pnl < 0 ? "from-negative to-transparent" : "from-fg-subtle to-transparent")} />
                    )}
                    <span className="relative z-10 mb-4 text-sm font-bold uppercase tracking-widest text-fg-subtle tnum">{yearStr}</span>
                    <span className={cn("relative z-10 mb-2 text-4xl font-bold tracking-tight tnum", active ? pnlTone(pnl) : "text-fg-faint")}>
                      {active ? <DisplayValue type="PNL" money={pnl} /> : "$0.00"}
                    </span>
                    <span className="relative z-10 mt-auto flex items-center justify-between border-t border-line/50 pt-6 text-sm font-medium text-fg-muted">
                      <span>Total trades</span>
                      <span className={active ? "text-fg" : "text-fg-faint"}>{tradeCount}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedYear !== null && selectedYearMeta && (
              <motion.div
                key={selectedYear}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="min-w-0 lg:sticky lg:top-6"
              >
                <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-lg)]">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-fg tnum">{selectedYear}</h3>
                      <p className="mt-1 text-xs text-fg-subtle">Yearly overview</p>
                    </div>
                    <button onClick={() => setSelectedYear(null)} aria-label="Close" className="rounded-[var(--radius-control)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">
                      <X size={18} weight="bold" />
                    </button>
                  </div>

                  {selectedYearMonths.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarBlank size={32} className="mb-3 text-fg-faint" />
                      <p className="text-sm font-medium text-fg">No trading activity</p>
                      <p className="mt-1 text-xs text-fg-subtle">There were no trades executed this year.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[var(--radius-control)] border border-line bg-base p-3">
                          <p className="mb-1 text-xs text-fg-subtle">Total P/L</p>
                          <p className={cn("text-lg font-bold tnum", pnlTone(selectedYearMeta.pnl))}>
                            <DisplayValue type="PNL" money={selectedYearMeta.pnl} />
                          </p>
                        </div>
                        <div className="rounded-[var(--radius-control)] border border-line bg-base p-3">
                          <p className="mb-1 text-xs text-fg-subtle">Trades</p>
                          <p className="text-lg font-bold text-fg tnum">{selectedYearMeta.tradeCount}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-3 border-b border-line pb-2 text-sm font-semibold text-fg">Active months</h4>
                        <div className="custom-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
                          {selectedYearMonths.map((m) => (
                            <button
                              key={m.month}
                              onClick={() => openMonthFromYear(m.month)}
                              className="flex w-full items-center justify-between rounded-[var(--radius-control)] border border-line bg-base p-3 text-left transition-colors hover:border-line-strong"
                            >
                              <div className="min-w-0">
                                <span className="block text-sm font-bold text-fg">{m.label}</span>
                                <span className="text-xs text-fg-subtle">{m.tradeCount} trade{m.tradeCount > 1 ? "s" : ""}</span>
                              </div>
                              <div className={cn("shrink-0 text-sm font-bold tnum", pnlTone(m.pnl))}>
                                <DisplayValue type="PNL" money={m.pnl} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
