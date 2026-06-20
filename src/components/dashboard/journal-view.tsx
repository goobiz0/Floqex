"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, ArrowDown, X } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRADES, dailyPnl, type MockTrade } from "@/lib/mock-data";
import { cn, formatUSD } from "@/lib/utils";

const YEAR = 2026;
const MONTH = 5; // June (0-indexed)
const MONTH_LABEL = "June 2026";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function JournalView() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [active, setActive] = useState<MockTrade | null>(null);
  const pnlByDay = useMemo(() => dailyPnl(), []);

  const cells = useMemo(() => {
    const firstDow = new Date(Date.UTC(YEAR, MONTH, 1)).getUTCDay();
    const lead = (firstDow + 6) % 7; // Monday-start offset
    const days = new Date(Date.UTC(YEAR, MONTH + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) {
      out.push(`${YEAR}-06-${String(d).padStart(2, "0")}`);
    }
    return out;
  }, []);

  const rows = useMemo(() => {
    const list = selectedDate
      ? TRADES.filter((t) => t.date === selectedDate)
      : TRADES;
    return [...list].sort((a, b) =>
      (b.date + b.time).localeCompare(a.date + a.time),
    );
  }, [selectedDate]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* Calendar */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-fg">{MONTH_LABEL}</h2>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-xs text-accent transition-colors hover:text-accent-hover"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-center text-[0.7rem] text-fg-faint">
              {w}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`b${i}`} />;
            const day = Number(date.slice(-2));
            const entry = pnlByDay.get(date);
            const selected = selectedDate === date;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(selected ? null : date)}
                className={cn(
                  "flex aspect-square flex-col rounded-[8px] border p-1.5 text-left transition-colors",
                  selected
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-base/40 hover:border-line-strong",
                )}
              >
                <span className="text-[0.7rem] text-fg-subtle">{day}</span>
                {entry && (
                  <span
                    className={cn(
                      "tnum mt-auto text-[0.7rem] font-medium",
                      entry.pnl >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {entry.pnl >= 0 ? "+" : ""}
                    {Math.round(entry.pnl)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Trade list */}
      <Card className="flex flex-col p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-medium text-fg">
            {selectedDate ? `Trades on ${selectedDate}` : "All trades"}
          </h2>
          <Badge tone="neutral" mono>
            {rows.length}
          </Badge>
        </div>
        <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {rows.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setActive(t)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface/60"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px]",
                    t.direction === "LONG"
                      ? "bg-accent-soft text-accent"
                      : "bg-negative-soft text-negative",
                  )}
                >
                  {t.direction === "LONG" ? (
                    <ArrowUp size={13} weight="bold" />
                  ) : (
                    <ArrowDown size={13} weight="bold" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{t.instrument}</p>
                  <p className="text-xs text-fg-subtle">
                    {t.date} · {t.time}
                  </p>
                </div>
                <span
                  className={cn(
                    "tnum text-sm font-medium",
                    t.win ? "text-positive" : "text-negative",
                  )}
                >
                  {formatUSD(t.netPnl, { sign: true })}
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-fg-subtle">
              No trades on this day.
            </li>
          )}
        </ul>
      </Card>

      <TradeDetail trade={active} onClose={() => setActive(null)} />
    </div>
  );
}

function TradeDetail({
  trade,
  onClose,
}: {
  trade: MockTrade | null;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!trade) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trade, onClose]);

  return (
    <AnimatePresence>
      {trade && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] overflow-y-auto border-l border-line bg-elevated p-6"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={
              reduce
                ? { opacity: 0 }
                : { x: "100%", transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }
            }
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-label={`Trade ${trade.id}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={trade.direction === "LONG" ? "positive" : "negative"}>
                  {trade.direction === "LONG" ? "Long" : "Short"}
                </Badge>
                <span className="text-sm font-medium text-fg">
                  {trade.instrument}
                </span>
                <span className="text-xs text-fg-subtle">{trade.session}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[var(--radius-control)] p-1.5 text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-control)] border border-line bg-line">
              {[
                ["Net P&L", formatUSD(trade.netPnl, { sign: true })],
                ["R multiple", `${trade.rMultiple > 0 ? "+" : ""}${trade.rMultiple}R`],
                ["Entry", trade.entry.toLocaleString()],
                ["Exit", trade.exit.toLocaleString()],
                ["Date", trade.date],
                ["Time", trade.time],
              ].map(([k, v]) => (
                <div key={k} className="bg-elevated p-3">
                  <p className="text-xs text-fg-subtle">{k}</p>
                  <p className="tnum mt-0.5 text-sm font-medium text-fg">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
                Bot narrative
              </p>
              <p className="mt-2 border-l-2 border-accent bg-base/50 p-3 font-mono text-[0.8rem] leading-relaxed text-fg-muted">
                {trade.session} session. Opening range healthy. Price closed{" "}
                {trade.direction === "LONG" ? "above the range high" : "below the range low"}
                , entered {trade.direction.toLowerCase()} at {trade.entry}.{" "}
                {trade.win
                  ? `Target hit, closed +${Math.abs(trade.rMultiple)}R.`
                  : "Stop hit, closed -1R."}
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="annotate"
                className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle"
              >
                Your notes
              </label>
              <textarea
                id="annotate"
                rows={3}
                placeholder="Add a note about this trade"
                className="mt-2 w-full resize-none rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus-visible:border-accent focus-visible:outline-none"
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
