"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MagnifyingGlass,
  TrendUp,
  TrendDown,
  ArrowUpRight,
  ArrowDownRight,
  Pulse,
  Spinner,
  ChartLineUp,
  ArrowLeft,
  Receipt,
  Bank,
} from "@phosphor-icons/react";
import { cn, formatUSD } from "@/lib/utils";

type Market = "US" | "ASX" | "CRYPTO";

type Quote = {
  symbol: string;
  instrument: string;
  market: Market;
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

type SymbolSuggestion = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  market: Market;
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

type AccountActivity = {
  accountId: string;
  nickname: string;
  broker: string;
  mode: string;
  executions: number;
  closedCount: number;
  openCount: number;
  winCount: number;
  realizedPnl: number;
  netUnits: number;
};

type Activity = {
  instrument: string;
  trades: ActivityTrade[];
  openTrades: ActivityTrade[];
  netUnits: number;
  realizedPnl: number;
  tradeCount: number;
  executions: number;
  winCount: number;
  accounts: AccountActivity[];
  hasAccount: boolean;
};

type AssetActivity = {
  instrument: string;
  market: Market;
  executions: number;
  closedCount: number;
  openCount: number;
  winCount: number;
  realizedPnl: number;
  activityPct: number;
  netUnits: number;
  lastTradedAt: string | null;
  accounts: AccountActivity[];
};

type Overview = {
  assets: AssetActivity[];
  totalExecutions: number;
  totalRealizedPnl: number;
  instrumentCount: number;
  hasAccount: boolean;
  error: boolean;
};

const SUGGESTIONS = ["AAPL", "NVDA", "TSLA", "SPY", "BTC", "ETH", "BHP.AX", "CBA.AX", "XJO"];
const POLL_MS = 5000;

const marketLabel: Record<Market, string> = { US: "Wall St", ASX: "ASX", CRYPTO: "Crypto" };

type SortKey = "activity" | "pnl" | "win" | "recent";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "pnl", label: "P&L" },
  { key: "win", label: "Win rate" },
  { key: "recent", label: "Recent" },
];

function winRateOf(winCount: number, closedCount: number): number | null {
  return closedCount > 0 ? (winCount / closedCount) * 100 : null;
}

function relativeDay(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MarketsExplorer({ initialSymbol = "" }: { initialSymbol?: string }) {
  const [query, setQuery] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bot-activity overview: every instrument the bots have traded.
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const justPickedRef = useRef(false);
  const currentSymbolRef = useRef(initialSymbol);
  // Client-side cache so re-typing a query returns matches instantly.
  const searchCacheRef = useRef<Map<string, SymbolSuggestion[]>>(new Map());

  // Overview controls
  const [sort, setSort] = useState<SortKey>("activity");
  const [marketFilter, setMarketFilter] = useState<Market | "ALL">("ALL");

  // Load the activity overview once; it powers the landing list and side panel.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/market/activity-overview");
        if (res.ok && active) setOverview(await res.json());
      } catch {
        /* offline, the empty state covers it */
      } finally {
        if (active) setOverviewLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Quote and activity are fetched independently so the price shows the instant
  // it lands rather than waiting on the (separate) activity query.
  const loadQuote = useCallback(async (sym: string, withSpinner = true) => {
    if (!sym) return;
    if (withSpinner) setQuoteLoading(true);
    try {
      const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(sym)}`);
      if (currentSymbolRef.current !== sym) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not load that symbol");
      }
      setQuote(await res.json());
      setError(null);
    } catch (e) {
      if (currentSymbolRef.current !== sym) return;
      setError((e as Error).message);
      setQuote(null);
    } finally {
      if (currentSymbolRef.current === sym) setQuoteLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async (sym: string) => {
    if (!sym) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/market/activity?symbol=${encodeURIComponent(sym)}`);
      if (currentSymbolRef.current !== sym) return;
      if (res.ok) setActivity(await res.json());
    } catch {
      /* non-fatal: the panel falls back to its empty state */
    } finally {
      if (currentSymbolRef.current === sym) setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    // Quote/activity are cleared in pick()/clearSymbol() before symbol changes,
    // so the effect never has to setState synchronously here.
    if (!symbol) return;
    // Defer the first fetches a tick so the effect body never setStates
    // synchronously; both then run independently (quote shows the moment it lands).
    const kick = setTimeout(() => {
      loadActivity(symbol);
      loadQuote(symbol);
    }, 0);
    const poll = setInterval(() => loadQuote(symbol, false), POLL_MS);
    return () => {
      clearTimeout(kick);
      clearInterval(poll);
    };
  }, [symbol, loadQuote, loadActivity]);

  // Debounced symbol autocomplete with a small client cache. All state updates
  // run inside the timeout (never synchronously in the effect body): empty and
  // cache hits resolve on the next tick (instant), network hits debounce 150ms.
  useEffect(() => {
    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }
    const q = query.trim();
    const cached = q.length < 1 ? [] : searchCacheRef.current.get(q.toLowerCase());
    const controller = new AbortController();
    const run = async () => {
      if (q.length < 1) {
        setSuggestions([]);
        setActiveIdx(-1);
        return;
      }
      if (cached) {
        setSuggestions(cached);
        setActiveIdx(-1);
        return;
      }
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const results: SymbolSuggestion[] = data.results || [];
        searchCacheRef.current.set(q.toLowerCase(), results);
        setSuggestions(results);
        setActiveIdx(-1);
      } catch {
        /* aborted or offline, ignore */
      }
    };
    const handle = setTimeout(run, q.length < 1 || cached ? 0 : 150);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = useCallback((sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    justPickedRef.current = true;
    currentSymbolRef.current = clean;
    // Clear stale data so the new symbol never flashes the previous one's numbers.
    setQuote(null);
    setActivity(null);
    setError(null);
    setQuery(clean);
    setSymbol(clean);
    setOpen(false);
    setSuggestions([]);
    setActiveIdx(-1);
  }, []);

  const clearSymbol = useCallback(() => {
    setSymbol("");
    setQuery("");
    setQuote(null);
    setActivity(null);
    setError(null);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (open && activeIdx >= 0 && suggestions[activeIdx]) {
      pick(suggestions[activeIdx].symbol);
      return;
    }
    pick(query);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const up = quote ? quote.change >= 0 : true;

  // Markets present across the traded assets, for the optional filter chips.
  const marketsPresent = useMemo(() => {
    const set = new Set<Market>();
    overview?.assets.forEach((a) => set.add(a.market));
    return set;
  }, [overview]);

  const rankedAssets = useMemo(() => {
    const copy = [...(overview?.assets ?? [])];
    copy.sort((a, b) => {
      if (sort === "pnl") return b.realizedPnl - a.realizedPnl;
      if (sort === "recent") return (b.lastTradedAt ?? "").localeCompare(a.lastTradedAt ?? "");
      if (sort === "win") {
        return (winRateOf(b.winCount, b.closedCount) ?? -1) - (winRateOf(a.winCount, a.closedCount) ?? -1);
      }
      return b.executions - a.executions || b.realizedPnl - a.realizedPnl;
    });
    return copy;
  }, [overview, sort]);

  const sortedAssets = useMemo(() => {
    if (marketFilter === "ALL") return rankedAssets;
    return rankedAssets.filter((a) => a.market === marketFilter);
  }, [rankedAssets, marketFilter]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div ref={searchBoxRef} className="relative">
          <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 focus-within:border-line-strong">
            <MagnifyingGlass size={18} className="text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
              onKeyDown={onKeyDown}
              placeholder="Search any stock by name or ticker (Apple, GOOGL, BHP.AX, BTC)"
              className="w-full bg-transparent py-3 text-sm text-fg placeholder:text-fg-faint outline-none"
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={open}
              aria-controls="market-search-listbox"
              aria-autocomplete="list"
            />
            <button
              type="submit"
              className="rounded-[var(--radius-control)] bg-accent px-3.5 py-1.5 text-sm font-semibold text-[var(--color-on-accent)] transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
            >
              Search
            </button>
          </div>

          {open && suggestions.length > 0 && (
            <ul id="market-search-listbox" role="listbox" className="absolute z-20 mt-2 w-full overflow-hidden rounded-[var(--radius-control)] border border-line bg-elevated shadow-[var(--shadow-md)]">
              {suggestions.map((s, i) => (
                <li key={`${s.symbol}-${i}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => pick(s.symbol)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors",
                      i === activeIdx ? "bg-surface-hover" : "hover:bg-surface",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="text-sm font-semibold text-fg">{s.symbol}</span>
                      <span className="truncate text-xs text-fg-subtle">{s.name}</span>
                    </span>
                    <span className="shrink-0 rounded-[var(--radius-pill)] border border-line bg-base px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                      {marketLabel[s.market]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pick(s)}
              className="rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-subtle transition-colors hover:text-fg hover:bg-surface-hover"
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="rounded-[var(--radius-card)] border border-negative/30 bg-negative-soft px-5 py-4 text-sm text-negative" role="alert">
          {error}
        </div>
      )}

      {!symbol ? (
        /* Landing: the bot-activity overview, shown until an asset is picked. */
        <ActivityOverview
          overview={overview}
          loading={overviewLoading}
          assets={sortedAssets}
          sort={sort}
          onSort={setSort}
          marketFilter={marketFilter}
          onMarketFilter={setMarketFilter}
          marketsPresent={marketsPresent}
          onSelect={pick}
        />
      ) : (
        /* Detail: quote + per-account activity, with the list as a side panel. */
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <button
              type="button"
              onClick={clearSymbol}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle transition-colors hover:text-fg"
            >
              <ArrowLeft size={14} />
              All bot activity
            </button>

            <QuoteCard quote={quote} loading={quoteLoading} symbol={symbol} up={up} />

            <ActivityDetail activity={activity} loading={activityLoading} instrument={quote?.instrument ?? symbol} />
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <ActivitySidePanel
              overview={overview}
              loading={overviewLoading}
              assets={rankedAssets}
              activeSymbol={symbol}
              onSelect={pick}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Overview ─────────────────────────── */

function ActivityOverview({
  overview,
  loading,
  assets,
  sort,
  onSort,
  marketFilter,
  onMarketFilter,
  marketsPresent,
  onSelect,
}: {
  overview: Overview | null;
  loading: boolean;
  assets: AssetActivity[];
  sort: SortKey;
  onSort: (s: SortKey) => void;
  marketFilter: Market | "ALL";
  onMarketFilter: (m: Market | "ALL") => void;
  marketsPresent: Set<Market>;
  onSelect: (sym: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-[var(--radius-card)] bg-surface/40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-[var(--radius-card)] bg-surface/30" />
        ))}
      </div>
    );
  }

  if (overview?.error) {
    return (
      <div className="rounded-[var(--radius-card)] border border-negative/30 bg-negative-soft px-5 py-4 text-sm text-negative">
        We could not load your bot activity. Please refresh.
      </div>
    );
  }

  if (!overview?.hasAccount) {
    return (
      <EmptyPanel
        title="No bot activity yet"
        body="Connect an account and let a bot run. Every instrument it trades shows up here, ranked by how active it is."
      />
    );
  }

  if (overview.assets.length === 0) {
    return (
      <EmptyPanel
        title="Your bots have not traded yet"
        body="Once a bot opens its first position, every instrument it touches is listed here with activity share, P&L, and a per-account split."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line/60 sm:grid-cols-3">
        <SummaryCell label="Instruments traded" value={String(overview.instrumentCount)} />
        <SummaryCell label="Total executions" value={overview.totalExecutions.toLocaleString()} />
        <SummaryCell
          label="Realized P&L"
          value={formatUSD(overview.totalRealizedPnl)}
          tone={overview.totalRealizedPnl > 0 ? "profit" : overview.totalRealizedPnl < 0 ? "negative" : "muted"}
        />
      </div>

      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pulse size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-fg">Most active instruments</h2>
        </div>
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-elevated p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onSort(s.key)}
              className={cn(
                "rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium transition-colors",
                sort === s.key ? "bg-surface text-fg shadow-[var(--shadow-sm)]" : "text-fg-subtle hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {marketsPresent.size > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "US", "ASX", "CRYPTO"] as const)
            .filter((m) => m === "ALL" || marketsPresent.has(m))
            .map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMarketFilter(m)}
                className={cn(
                  "rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-medium transition-colors",
                  marketFilter === m
                    ? "border-accent/50 bg-accent-soft text-accent"
                    : "border-line bg-surface text-fg-subtle hover:text-fg",
                )}
              >
                {m === "ALL" ? "All markets" : marketLabel[m]}
              </button>
            ))}
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated">
        <ul className="divide-y divide-line/60">
          {assets.map((asset, i) => (
            <li key={asset.instrument}>
              <AssetRow asset={asset} rank={i + 1} onSelect={() => onSelect(asset.instrument)} />
            </li>
          ))}
        </ul>
        {assets.length === 0 && (
          <p className="px-6 py-10 text-center text-xs text-fg-subtle">No instruments in this market.</p>
        )}
      </div>
    </div>
  );
}

function AssetRow({ asset, rank, onSelect }: { asset: AssetActivity; rank: number; onSelect: () => void }) {
  const winRate = winRateOf(asset.winCount, asset.closedCount);
  const pnlTone = asset.realizedPnl > 0 ? "text-profit" : asset.realizedPnl < 0 ? "text-negative" : "text-fg";
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full px-4 py-3.5 text-left transition-colors hover:bg-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent-ring)]"
    >
      <div className="grid grid-cols-12 items-center gap-x-3 gap-y-2">
        {/* Instrument */}
        <div className="col-span-12 flex min-w-0 items-center gap-3 sm:col-span-4">
          <span className="tnum w-5 shrink-0 text-right text-xs font-medium text-fg-faint">{rank}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-fg">{asset.instrument}</span>
              <MarketBadge market={asset.market} />
            </div>
            <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
              {asset.accounts.length} {asset.accounts.length === 1 ? "account" : "accounts"}
              {asset.lastTradedAt ? ` · ${relativeDay(asset.lastTradedAt)}` : ""}
            </p>
          </div>
        </div>

        {/* Activity share */}
        <div className="col-span-6 sm:col-span-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-fg-subtle">
            <span>Activity</span>
            <span className="tnum font-medium text-fg-muted">{asset.activityPct.toFixed(1)}%</span>
          </div>
          <ActivityBar pct={asset.activityPct} />
        </div>

        {/* Executions */}
        <div className="col-span-3 text-right sm:col-span-2">
          <p className="tnum text-sm font-semibold text-fg">{asset.executions.toLocaleString()}</p>
          <p className="text-[11px] text-fg-subtle">fills</p>
        </div>

        {/* Win rate */}
        <div className="col-span-3 hidden text-right sm:col-span-1 sm:block">
          <p className="tnum text-sm font-semibold text-fg">{winRate !== null ? `${winRate.toFixed(0)}%` : "N/A"}</p>
          <p className="text-[11px] text-fg-subtle">win</p>
        </div>

        {/* Realized P&L */}
        <div className="col-span-3 text-right sm:col-span-2">
          <p className={cn("tnum text-sm font-semibold", pnlTone)}>{formatUSD(asset.realizedPnl)}</p>
          <p className="text-[11px] text-fg-subtle">realized</p>
        </div>
      </div>

      {/* Per-account split hint when the asset spans multiple accounts */}
      {asset.accounts.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
          {asset.accounts.slice(0, 4).map((a) => (
            <span
              key={a.accountId}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 text-[11px] text-fg-subtle"
            >
              <span className="max-w-[120px] truncate font-medium text-fg-muted">{a.nickname}</span>
              <span className="tnum text-fg-faint">{a.executions}</span>
              <span
                className={cn(
                  "tnum font-medium",
                  a.realizedPnl > 0 ? "text-profit" : a.realizedPnl < 0 ? "text-negative" : "text-fg-faint",
                )}
              >
                {formatUSD(a.realizedPnl)}
              </span>
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/* ─────────────────────────── Side panel ─────────────────────────── */

function ActivitySidePanel({
  overview,
  loading,
  assets,
  activeSymbol,
  onSelect,
}: {
  overview: Overview | null;
  loading: boolean;
  assets: AssetActivity[];
  activeSymbol: string;
  onSelect: (sym: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated">
      <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Pulse size={15} className="text-accent" />
          <h3 className="text-sm font-medium text-fg">Bot activity</h3>
        </div>
        {overview?.hasAccount && overview.assets.length > 0 && (
          <span className="tnum text-[11px] text-fg-subtle">{overview.instrumentCount}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mx-3 my-2 h-10 animate-pulse rounded-[var(--radius-control)] bg-surface/30" />
          ))}
        </div>
      ) : !overview?.hasAccount || overview.assets.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-fg-subtle">No traded instruments yet.</p>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-line/50 overflow-y-auto">
          {assets.map((asset) => {
            const active = asset.instrument === activeSymbol;
            return (
              <li key={asset.instrument}>
                <button
                  type="button"
                  onClick={() => onSelect(asset.instrument)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent-ring)]",
                    active ? "bg-accent-soft" : "hover:bg-surface/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className={cn("truncate text-sm font-semibold", active ? "text-accent" : "text-fg")}>
                        {asset.instrument}
                      </span>
                      <MarketBadge market={asset.market} />
                    </span>
                    <span
                      className={cn(
                        "tnum shrink-0 text-xs font-semibold",
                        asset.realizedPnl > 0 ? "text-profit" : asset.realizedPnl < 0 ? "text-negative" : "text-fg-muted",
                      )}
                    >
                      {formatUSD(asset.realizedPnl)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ActivityBar pct={asset.activityPct} />
                    <span className="tnum shrink-0 text-[11px] text-fg-subtle">{asset.executions}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────── Quote ─────────────────────────── */

function QuoteCard({
  quote,
  loading,
  symbol,
  up,
}: {
  quote: Quote | null;
  loading: boolean;
  symbol: string;
  up: boolean;
}) {
  if (!quote) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-line/60 p-6">
          <div>
            {/* Optimistic header: show the picked symbol immediately. */}
            <h2 className="text-lg font-semibold tracking-tight text-fg">{symbol}</h2>
            <p className="mt-1 text-xs text-fg-subtle">{loading ? "Loading live price…" : "No price available"}</p>
          </div>
          <Spinner size={20} className={cn("text-fg-subtle", loading && "animate-spin")} />
        </div>
        <div className="grid grid-cols-3 divide-x divide-line/60">
          {["Day high", "Day low", "Prev close"].map((l) => (
            <div key={l} className="p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{l}</p>
              <div className="mt-2 h-5 w-16 animate-pulse rounded bg-surface-hover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/60 p-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-fg">{quote.instrument}</h2>
            <MarketBadge market={quote.market} />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                quote.isOpen ? "bg-profit/10 text-profit" : "border border-line bg-surface text-fg-subtle",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", quote.isOpen ? "bg-profit" : "bg-fg-faint")} />
              {quote.isOpen ? "Open" : "Closed"}
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-subtle">{quote.shortName}</p>
        </div>
        <div className="text-right">
          <p className="tnum text-[32px] font-semibold leading-none tracking-tight text-fg">
            {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="ml-1 text-sm font-medium text-fg-subtle">{quote.currency}</span>
          </p>
          <p className={cn("tnum mt-2 inline-flex items-center gap-1 text-sm font-semibold", up ? "text-profit" : "text-negative")}>
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
  );
}

/* ─────────────────────────── Activity detail ─────────────────────────── */

function ActivityDetail({
  activity,
  loading,
  instrument,
}: {
  activity: Activity | null;
  loading: boolean;
  instrument: string;
}) {
  if (loading && !activity) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-sm)]">
        <div className="border-b border-line/60 px-6 py-4">
          <div className="h-4 w-44 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="grid grid-cols-2 gap-px bg-line/60 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface p-5">
              <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
              <div className="mt-2 h-5 w-12 animate-pulse rounded bg-surface-hover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activity) return null;

  const winRate = winRateOf(activity.winCount, activity.tradeCount);
  const multiAccount = activity.accounts.length > 1;

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 border-b border-line/60 px-6 py-4">
        <Pulse size={16} className="text-accent" />
        <h3 className="text-sm font-medium text-fg">Your bot activity on {instrument}</h3>
      </div>

      {!activity.hasAccount ? (
        <p className="px-6 py-10 text-center text-xs text-fg-subtle">Connect an account to track bot activity here.</p>
      ) : activity.executions === 0 ? (
        <p className="px-6 py-10 text-center text-xs text-fg-subtle">No bot trades on {instrument} yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px bg-line/60 sm:grid-cols-4">
            <Metric
              label="Holding"
              value={activity.netUnits === 0 ? "Flat" : `${activity.netUnits > 0 ? "+" : ""}${activity.netUnits.toFixed(2)}`}
              tone={activity.netUnits === 0 ? "muted" : activity.netUnits > 0 ? "profit" : "negative"}
            />
            <Metric label="Executions" value={activity.executions.toLocaleString()} tone="muted" />
            <Metric
              label="Realized P/L"
              value={formatUSD(activity.realizedPnl)}
              tone={activity.realizedPnl > 0 ? "profit" : activity.realizedPnl < 0 ? "negative" : "muted"}
            />
            <Metric label="Win rate" value={winRate !== null ? `${winRate.toFixed(0)}%` : "N/A"} tone="muted" />
          </div>

          {/* Per-account split */}
          {activity.accounts.length > 0 && (
            <div className="border-t border-line/60">
              <div className="flex items-center gap-2 px-6 pt-4">
                <Bank size={14} className="text-fg-subtle" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  {multiAccount ? "Activity by account" : "Account"}
                </h4>
              </div>
              <ul className="mt-2 divide-y divide-line/40">
                {activity.accounts.map((a) => {
                  const aWin = winRateOf(a.winCount, a.closedCount);
                  return (
                    <li key={a.accountId} className="flex items-center justify-between gap-3 px-6 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-fg">{a.nickname}</span>
                          <ModeBadge mode={a.mode} />
                        </div>
                        <p className="tnum mt-0.5 text-[11px] text-fg-subtle">
                          {a.broker} · {a.executions} fills{aWin !== null ? ` · ${aWin.toFixed(0)}% win` : ""}
                          {a.openCount > 0 ? ` · ${a.openCount} open` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "tnum shrink-0 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold",
                          a.realizedPnl > 0
                            ? "bg-profit/10 text-profit"
                            : a.realizedPnl < 0
                              ? "bg-negative-soft text-negative"
                              : "bg-surface text-fg-muted",
                        )}
                      >
                        {formatUSD(a.realizedPnl)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Recent fills */}
          <div className="border-t border-line/60">
            <div className="flex items-center gap-2 px-6 pt-4">
              <Receipt size={14} className="text-fg-subtle" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Recent fills</h4>
            </div>
            <ul className="mt-2 divide-y divide-line/40">
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
                        <p className="tnum text-[11px] text-fg-subtle">
                          Entry {t.entryPrice.toFixed(2)}
                          {t.exitPrice != null ? ` · Exit ${t.exitPrice.toFixed(2)}` : ""} · {new Date(t.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    {t.status === "CLOSED" ? (
                      <span className={cn("tnum rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold", pnl >= 0 ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative")}>
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
          </div>
        </>
      )}
    >
      {live ? "Live" : "Paper"}
    </span>
  );
}

function ActivityBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
    </div>
  );
}

function SummaryCell({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "profit" | "negative" | "muted" }) {
  return (
    <div className="bg-elevated p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p
        className={cn(
          "tnum mt-1 text-lg font-semibold",
          tone === "profit" ? "text-profit" : tone === "negative" ? "text-negative" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/30 py-20 text-center">
      <ChartLineUp size={28} className="mb-3 text-fg-subtle" />
      <h3 className="text-sm font-medium text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-fg-subtle">{body}</p>
    </div>
  );
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

function MarketBadge({ market }: { market: Market }) {
  return (
    <span className="shrink-0 rounded-[var(--radius-pill)] border border-line bg-base px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
      {marketLabel[market]}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const live = mode === "LIVE";
  return (
    <span
      className={cn(
        "shrink-0 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        live ? "bg-accent-soft text-accent" : "border border-line bg-base text-fg-subtle",
      )}
    >
      {live ? "Live" : "Paper"}
    </span>
  );
}

function ActivityBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
    </div>
  );
}

function SummaryCell({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "profit" | "negative" | "muted" }) {
  return (
    <div className="bg-elevated p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p
        className={cn(
          "tnum mt-1 text-lg font-semibold",
          tone === "profit" ? "text-profit" : tone === "negative" ? "text-negative" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/30 py-20 text-center">
      <ChartLineUp size={28} className="mb-3 text-fg-subtle" />
      <h3 className="text-sm font-medium text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-fg-subtle">{body}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="tnum mt-1 text-base font-semibold text-fg">{value}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "profit" | "negative" | "muted" }) {
  return (
    <div className="bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p
        className={cn(
          "tnum mt-1 text-lg font-semibold",
          tone === "profit" ? "text-profit" : tone === "negative" ? "text-negative" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}
