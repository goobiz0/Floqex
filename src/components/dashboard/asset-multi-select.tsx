"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MagnifyingGlass,
  X,
  Check,
  Buildings,
  ChartPieSlice,
  ChartLineUp,
  CurrencyBtc,
  CurrencyDollar,
  Coins,
  Plus,
  type Icon,
} from "@phosphor-icons/react";
import {
  searchLocalAssets,
  mergeAssetResults,
  getAsset,
  marketLabelFor,
  kindLabelFor,
  type Asset,
  type AssetKind,
  type AssetMarket,
} from "@/lib/assets";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<AssetKind, Icon> = {
  STOCK: Buildings,
  ETF: ChartPieSlice,
  INDEX: ChartLineUp,
  CRYPTO: CurrencyBtc,
  FOREX: CurrencyDollar,
  COMMODITY: Coins,
};

/** Square asset glyph: kind-based icon on the single accent tint. */
export function AssetIcon({ kind, size = 18 }: { kind: AssetKind; size?: number }) {
  const I = KIND_ICON[kind] ?? Buildings;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
      <I size={size} weight="duotone" />
    </span>
  );
}

// Map a live Yahoo search result's quoteType to our asset kind.
function kindFromType(type: string): AssetKind {
  const t = type.toUpperCase();
  if (t === "ETF") return "ETF";
  if (t === "INDEX") return "INDEX";
  if (t === "CRYPTOCURRENCY") return "CRYPTO";
  if (t === "CURRENCY") return "FOREX";
  return "STOCK";
}

type LiveResult = { symbol: string; name: string; market: AssetMarket; type: string };

/**
 * Multi-asset picker for "what should this bot trade?". Local catalogue results
 * render instantly on every keystroke (no waiting on the network); live API
 * matches are merged in as they arrive so the long tail of every listed symbol
 * is reachable. Selected assets show as removable chips.
 */
export function AssetMultiSelect({
  value,
  onChange,
  max = 20,
  placeholder = "Search any stock, ETF, index or crypto (AAPL, BTC, BHP.AX)",
}: {
  value: string[];
  onChange: (symbols: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [live, setLive] = useState<Asset[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Instant local results, recomputed synchronously as the user types.
  const local = useMemo(() => searchLocalAssets(query, 8), [query]);

  // Merge local + live, then drop anything already selected.
  const results = useMemo(() => {
    const merged = mergeAssetResults(local, live, 12);
    const selected = new Set(value.map((v) => v.toUpperCase()));
    return merged.filter((a) => !selected.has(a.symbol.toUpperCase()));
  }, [local, live, value]);

  // Live search, debounced. Local results already cover the instant case, so the
  // network round-trip only ever *adds* matches; it never blocks the dropdown.
  // All state updates happen inside the async timeout (never synchronously in the
  // effect body) so typing never triggers a cascading render.
  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      if (q.length < 1) {
        setLive([]);
        return;
      }
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { results?: LiveResult[] };
        const mapped: Asset[] = (data.results ?? []).map((r) => ({
          symbol: r.symbol,
          name: r.name,
          market: r.market,
          kind: kindFromType(r.type),
        }));
        setLive(mapped);
      } catch {
        /* aborted / offline: local results still stand */
      }
    }, 160);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function add(symbol: string) {
    const clean = symbol.trim().toUpperCase();
    if (!clean || value.includes(clean) || value.length >= max) return;
    onChange([...value, clean]);
    setQuery("");
    setLive([]);
  }

  function remove(symbol: string) {
    onChange(value.filter((s) => s !== symbol));
  }

  const atMax = value.length >= max;

  return (
    <div ref={boxRef} className="relative">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((sym) => {
            const meta = getAsset(sym);
            const kind = meta?.kind ?? "STOCK";
            const I = KIND_ICON[kind];
            return (
              <span
                key={sym}
                className="group inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-accent/30 bg-accent-soft py-1 pl-2 pr-1 text-sm"
              >
                <I size={14} weight="duotone" className="text-accent" />
                <span className="font-semibold tnum text-accent">{sym}</span>
                {meta && <span className="hidden max-w-[140px] truncate text-xs text-fg-muted sm:inline">{meta.name}</span>}
                <button
                  type="button"
                  onClick={() => remove(sym)}
                  aria-label={`Remove ${sym}`}
                  className="rounded-[var(--radius-pill)] p-0.5 text-accent/70 transition-colors hover:bg-accent/15 hover:text-accent"
                >
                  <X size={13} weight="bold" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-control)] border bg-surface px-3 transition-colors",
          atMax ? "border-line opacity-60" : "border-line focus-within:border-accent",
        )}
      >
        <MagnifyingGlass size={16} className="shrink-0 text-fg-subtle" />
        <input
          value={query}
          disabled={atMax}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActiveIdx((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const pick = results[activeIdx] ?? results[0];
              if (pick) add(pick.symbol);
              else if (query.trim()) add(query); // allow free-form tickers
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Backspace" && !query && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={atMax ? `Maximum ${max} assets selected` : placeholder}
          className="w-full bg-transparent py-2.5 text-sm text-fg placeholder:text-fg-faint outline-none disabled:cursor-not-allowed"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls="asset-multiselect-listbox"
          aria-autocomplete="list"
        />
        {value.length > 0 && (
          <span className="shrink-0 rounded-[var(--radius-pill)] bg-base px-2 py-0.5 text-[11px] font-medium tnum text-fg-subtle">
            {value.length}/{max}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && !atMax && results.length > 0 && (
        <ul
          id="asset-multiselect-listbox"
          role="listbox"
          className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-[var(--radius-card)] border border-line bg-elevated p-1.5 shadow-[var(--shadow-lg)]"
        >
          {results.map((a, i) => (
            <li key={`${a.symbol}-${i}`} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => add(a.symbol)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-left transition-colors",
                  i === activeIdx ? "bg-surface" : "hover:bg-surface/60",
                )}
              >
                <AssetIcon kind={a.kind} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold tnum text-fg">{a.symbol}</span>
                    <span className="rounded-[var(--radius-pill)] border border-line bg-base px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                      {kindLabelFor(a.kind)}
                    </span>
                  </span>
                  <span className="truncate text-xs text-fg-subtle">{a.name}</span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-fg-faint">{marketLabelFor(a.market)}</span>
                <Plus size={15} weight="bold" className="shrink-0 text-fg-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !atMax && query.trim() && results.length === 0 && (
        <div className="absolute z-40 mt-2 w-full rounded-[var(--radius-card)] border border-line bg-elevated p-3 shadow-[var(--shadow-lg)]">
          <button
            type="button"
            onClick={() => add(query)}
            className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-surface"
          >
            <Check size={15} weight="bold" className="text-accent" />
            Add <span className="font-semibold tnum text-fg">{query.trim().toUpperCase()}</span> as a custom ticker
          </button>
        </div>
      )}
    </div>
  );
}
