"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type SymbolSuggestion = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  market: "US" | "ASX" | "CRYPTO";
};

const marketLabel: Record<SymbolSuggestion["market"], string> = { US: "Wall St", ASX: "ASX", CRYPTO: "Crypto" };

// Reusable "search any instrument" input with live autocomplete. Used by the bot
// builder to pick what the bot trades. Commits the chosen ticker via onSelect.
export function SymbolSearchInput({
  value,
  onSelect,
  placeholder = "Search any stock or symbol (AAPL, BHP.AX, BTC)",
}: {
  value: string;
  onSelect: (symbol: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      if (q.length < 1) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.results || []);
        setActiveIdx(-1);
      } catch {
        /* aborted / offline */
      }
    }, 200);
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

  const pick = (symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    onSelect(clean);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  };

  return (
    <div ref={boxRef} className="relative">
      {value && (
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
            {value}
            <button type="button" onClick={() => onSelect("")} aria-label="Clear instrument" className="text-accent/70 hover:text-accent">
              <X size={12} weight="bold" />
            </button>
          </span>
          <span className="text-xs text-fg-subtle">is the instrument this bot will trade</span>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 focus-within:border-accent">
        <MagnifyingGlass size={16} className="text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (activeIdx >= 0) pick(suggestions[activeIdx].symbol); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-sm text-fg placeholder:text-fg-faint outline-none"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls="symbol-search-listbox"
          aria-autocomplete="list"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul id="symbol-search-listbox" role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-[var(--radius-control)] border border-line bg-elevated shadow-[var(--shadow-md)]">
          {suggestions.map((s, i) => (
            <li key={`${s.symbol}-${i}`}>
              <button
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => pick(s.symbol)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
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
  );
}
