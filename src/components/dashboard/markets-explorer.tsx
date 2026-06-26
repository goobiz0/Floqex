"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MagnifyingGlass,
  TrendUp,
  TrendDown,
  ArrowUpRight,
  ArrowDownRight,
  Pulse,
  Spinner,
  ChartLineUp,
} from "@phosphor-icons/react";
import { cn, formatUSD } from "@/lib/utils";

type Quote = {
  symbol: string;
  instrument: string;
  market: "US" | "ASX" | "CRYPTO";
  isOpen: boolean;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  currency: string;
  shortName: string;
};

type ActivityTrade = {
  id: string;
  instrument: string;
  direction: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED";
  entryPrice: number;
  exitPrice: number | null;
  netPnl: number | null;
  rMultiple: number | null;
  openedAt: string;
  closedAt: string | null;
};

type Activity = {
  instrument: string;
  trades: ActivityTrade[];
  openTrades: ActivityTrade[];
  netUnits: number;
  realizedPnl: number;
  tradeCount: number;
  winCount: number;
  hasAccount: boolean;
};

const SUGGESTIONS = ["AAPL", "NVDA", "TSLA", "SPY", "BTC", "ETH", "BHP.AX", "CBA.AX", "XJO"];
const POLL_MS = 5000;

const marketLabel: Record<Quote["market"], string> = { US: "Wall St", ASX: "ASX", CRYPTO: "Crypto" };

export function MarketsExplorer({ initialSymbol = "" }: { initialSymbol?: string }) {
  const [query, setQuery] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (sym: string, withSpinner = true) => {
    if (!sym) return;
    if (withSpinner) setLoading(true);
    setError(null);
    try {
      const [qRes, aRes] = await Promise.all([
        fetch(`/api/market/quote?symbol=${encodeURIComponent(sym)}`),
        fetch(`/api/market/activity?symbol=${encodeURIComponent(sym)}`),
      ]);
      if (!qRes.ok) {
        const body = await qRes.json().catch(() => ({}));
        throw new Error(body.error || "Could not load that symbol");
      }
      setQuote(await qRes.json());
      if (aRes.ok) setActivity(await aRes.json());
    } catch (e) {
      setError((e as Error).message);
      setQuote(null);
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the quote for live data while a symbol is selected. The initial load is
  // deferred out of the effect body so the spinner state change isn't a
  // synchronous setState during the effect.
  useEffect(() => {
    if (!symbol) return;
    const kick = setTimeout(() => load(symbol), 0);
    const poll = setInterval(() => load(symbol, false), POLL_MS);
    return () => {
      clearTimeout(kick);
      clearInterval(poll);
    };
  }, [symbol, load]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = query.trim().toUpperCase();
    if (sym) setSymbol(sym);
  };

  const up = quote ? quote.change >= 0 : true;
  const winRate = activity && activity.tradeCount > 0 ? (activity.winCount / activity.tradeCount) * 100 : null;

  return (
    <div className="space-y-6">
      {/* Search */}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 focus-within:border-line-strong">
          <MagnifyingGlass size={18} className="text-fg-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a stock or symbol (AAPL, BHP.AX, BTC)"
            className="w-full bg-transparent py-3 text-sm text-fg placeholder:text-fg-faint outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="rounded-[var(--radius-control)] bg-accent px-3.5 py-1.5 text-sm font-semibold text-[var(--color-on-accent)] transition-colors hover:bg-accent-hover"
          >
            Search
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setQuery(s); setSymbol(s); }}
              className="rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-subtle transition-colors hover:text-fg hover:bg-surface-hover"
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="rounded-[var(--radius-card)] border border-negative/30 bg-negative-soft px-5 py-4 text-sm text-negative">
          {error}
        </div>
      )}

      {!symbol && !error && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/30 py-20 text-center">
          <ChartLineUp size={28} className="mb-3 text-fg-subtle" />
          <h3 className="text-sm font-medium text-fg">Look up any market</h3>
          <p className="mt-1 max-w-sm text-xs text-fg-subtle">
            Search Wall St, ASX, or crypto for live prices and see exactly what your bots have done with that instrument.
          </p>
        </div>
      )}

      {symbol && loading && !quote && (
        <div className="flex items-center justify-center py-20 text-fg-subtle">
          <Spinner size={22} className="animate-spin" />
        </div>
      )}

      {/* Quote card */}
      {quote && (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/60 p-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-fg">{quote.instrument}</h2>
                <span className="rounded-[var(--radius-pill)] border border-line bg-base px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                  {marketLabel[quote.market]}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    quote.isOpen ? "bg-profit/10 text-profit" : "bg-surface text-fg-subtle border border-line",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", quote.isOpen ? "bg-profit" : "bg-fg-faint")} />
                  {quote.isOpen ? "Open" : "Closed"}
                </span>
              </div>
              <p className="mt-1 text-xs text-fg-subtle">{quote.shortName}</p>
            </div>
            <div className="text-right">
              <p className="text-[32px] font-semibold leading-none tracking-tight text-fg tnum">
                {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="ml-1 text-sm font-medium text-fg-subtle">{quote.currency}</span>
              </p>
              <p className={cn("mt-2 inline-flex items-center gap-1 text-sm font-semibold tnum", up ? "text-profit" : "text-negative")}>
                {up ? <ArrowUpRight size={14} weight="bold" /> : <ArrowDownRight size={14} weight="bold" />}
                {up ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line/60">
            <Stat label="Day high" value={quote.dayHigh.toFixed(2)} />
            <Stat label="Day low" value={quote.dayLow.toFixed(2)} />
            <Stat label="Prev close" value={quote.previousClose.toFixed(2)} />
          </div>
        </div>
      )}

      {/* Bot activity for this instrument */}
      {quote && activity && (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 border-b border-line/60 px-6 py-4">
            <Pulse size={16} className="text-accent" />
            <h3 className="text-sm font-medium text-fg">Your bot activity on {quote.instrument}</h3>
          </div>

          {!activity.hasAccount ? (
            <p className="px-6 py-10 text-center text-xs text-fg-subtle">Connect an account to track bot activity here.</p>
          ) : activity.trades.length === 0 ? (
            <p className="px-6 py-10 text-center text-xs text-fg-subtle">No bot trades on {quote.instrument} yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-px bg-line/60 sm:grid-cols-4">
                <Metric
                  label="Holding"
                  value={activity.netUnits === 0 ? "Flat" : `${activity.netUnits > 0 ? "+" : ""}${activity.netUnits.toFixed(2)}`}
                  tone={activity.netUnits === 0 ? "muted" : activity.netUnits > 0 ? "profit" : "negative"}
                />
                <Metric label="Open positions" value={String(activity.openTrades.length)} tone="muted" />
                <Metric
                  label="Realized P/L"
                  value={formatUSD(activity.realizedPnl)}
                  tone={activity.realizedPnl > 0 ? "profit" : activity.realizedPnl < 0 ? "negative" : "muted"}
                />
                <Metric label="Win rate" value={winRate !== null ? `${winRate.toFixed(0)}%` : "N/A"} tone="muted" />
              </div>

              <ul className="divide-y divide-line/40">
                {activity.trades.slice(0, 12).map((t) => {
                  const isBuy = t.direction === "LONG";
                  const pnl = t.netPnl ?? 0;
                  return (
                    <li key={t.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-[8px]", isBuy ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative")}>
                          {isBuy ? <TrendUp size={15} /> : <TrendDown size={15} />}
                        </span>
                        <div>
                          <p className="text-[13px] font-medium text-fg">
                            {isBuy ? "Bought" : "Sold"} · {t.status === "OPEN" ? "Holding" : "Closed"}
                          </p>
                          <p className="text-[11px] text-fg-subtle tnum">
                            Entry {t.entryPrice.toFixed(2)}
                            {t.exitPrice != null ? ` · Exit ${t.exitPrice.toFixed(2)}` : ""} · {new Date(t.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      {t.status === "CLOSED" ? (
                        <span className={cn("rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold tnum", pnl >= 0 ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative")}>
                          {formatUSD(pnl)}
                        </span>
                      ) : (
                        <span className="rounded-[var(--radius-pill)] bg-accent-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
                          Open
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="mt-1 text-base font-semibold text-fg tnum">{value}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "profit" | "negative" | "muted" }) {
  return (
    <div className="bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tnum",
          tone === "profit" ? "text-profit" : tone === "negative" ? "text-negative" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}
