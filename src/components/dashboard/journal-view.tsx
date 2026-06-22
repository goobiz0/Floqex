"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, ArrowDown, X } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { dailyPnl, type TradeRow, type DailyRow } from "@/lib/metrics";
import { cn, formatUSD } from "@/lib/utils";

type TradeFilter = "all" | "wins" | "losses";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dateOf = (t: TradeRow) => t.openedAt.slice(0, 10);
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

export function JournalView({
  trades,
  summaries,
}: {
  trades: TradeRow[];
  summaries: DailyRow[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [active, setActive] = useState<TradeRow | null>(null);
  const [filter, setFilter] = useState<TradeFilter>("all");
  const pnlByDay = useMemo(() => dailyPnl(summaries), [summaries]);

  // Show the most recent month that has data (or the current month if empty).
  const anchor = useMemo(() => {
    const latest = summaries.length
      ? summaries[summaries.length - 1].date
      : trades.length
        ? dateOf(trades[0])
        : new Date().toISOString().slice(0, 10);
    const [year, month] = latest.split("-").map(Number);
    return { year, month: month - 1 };
  }, [summaries, trades]);

  const monthLabel = useMemo(
    () =>
      new Date(Date.UTC(anchor.year, anchor.month, 1)).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [anchor],
  );

  const cells = useMemo(() => {
    const firstDow = new Date(Date.UTC(anchor.year, anchor.month, 1)).getUTCDay();
    const lead = (firstDow + 6) % 7; // Monday-start offset
    const days = new Date(Date.UTC(anchor.year, anchor.month + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) {
      out.push(
        `${anchor.year}-${String(anchor.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
    }
    return out;
  }, [anchor]);

  const rows = useMemo(() => {
    let list = selectedDate ? trades.filter((t) => dateOf(t) === selectedDate) : trades;
    if (filter === "wins") list = list.filter((t) => (t.netPnl ?? 0) >= 0);
    else if (filter === "losses") list = list.filter((t) => (t.netPnl ?? 0) < 0);
    return [...list].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }, [selectedDate, trades, filter]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* Calendar */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-fg">{monthLabel}</h2>
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
                      entry.pnl >= 0 ? "text-profit" : "text-negative",
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
        <div className="border-b border-line px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg">
              {selectedDate ? `Trades on ${selectedDate}` : "All trades"}
            </h2>
            <Badge tone="neutral" mono>
              {rows.length}
            </Badge>
          </div>
          <div className="mt-3">
            <Segmented
              size="sm"
              options={[
                { value: "all", label: "All" },
                { value: "wins", label: "Wins" },
                { value: "losses", label: "Losses" },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>
        </div>
        <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {rows.map((t) => {
            const long = t.direction === "LONG";
            const win = (t.netPnl ?? 0) >= 0;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActive(t)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface/60"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
                      long ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
                    )}
                  >
                    {long ? <ArrowUp size={15} weight="bold" /> : <ArrowDown size={15} weight="bold" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">{t.instrument}</p>
                    <p className="text-xs text-fg-subtle">
                      {dateOf(t)} · {timeOf(t.openedAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tnum shrink-0 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium",
                      win ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative",
                    )}
                  >
                    {formatUSD(t.netPnl ?? 0, { sign: true })}
                  </span>
                </button>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-fg-subtle">No trades yet.</li>
          )}
        </ul>
      </Card>

      <TradeDetail trade={active} onClose={() => setActive(null)} />
    </div>
  );
}

function TradeDetail({ trade, onClose }: { trade: TradeRow | null; onClose: () => void }) {
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
            aria-label={`Trade detail: ${trade.instrument}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={trade.direction === "LONG" ? "positive" : "negative"}>
                  {trade.direction === "LONG" ? "Long" : "Short"}
                </Badge>
                <span className="text-sm font-medium text-fg">{trade.instrument}</span>
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
              {(
                [
                  ["Net P&L", formatUSD(trade.netPnl ?? 0, { sign: true })],
                  [
                    "R multiple",
                    trade.rMultiple != null
                      ? `${trade.rMultiple > 0 ? "+" : ""}${trade.rMultiple}R`
                      : "—",
                  ],
                  ["Entry", trade.entryPrice.toLocaleString()],
                  ["Exit", trade.exitPrice != null ? trade.exitPrice.toLocaleString() : "—"],
                  ["Date", dateOf(trade)],
                  ["Time", timeOf(trade.openedAt)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="bg-elevated p-3">
                  <p className="text-xs text-fg-subtle">{k}</p>
                  <p className="tnum mt-0.5 text-sm font-medium text-fg">{v}</p>
                </div>
              ))}
            </div>

            {trade.screenshotUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trade.screenshotUrl}
                alt={`Chart for the ${trade.instrument} trade`}
                className="mt-5 w-full rounded-[var(--radius-control)] border border-line"
              />
            )}

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
                Bot narrative
              </p>
              <p className="mt-2 border-l-2 border-accent bg-base/50 p-3 font-mono text-[0.8rem] leading-relaxed text-fg-muted">
                {trade.narrative ?? "No narrative was recorded for this trade."}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
