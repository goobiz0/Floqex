"use client";

import { useState, useRef, useEffect } from "react";
import { MagnifyingGlass, BookBookmark, Strategy, RocketLaunch, ShieldCheck, CreditCard } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DOC_PAGES = [
  { href: "/docs", label: "Getting Started", icon: RocketLaunch, keywords: "welcome intro engine autonomous start" },
  { href: "/docs/strategy", label: "ORB Strategy", icon: Strategy, keywords: "orb opening range breakout algorithm strategy risk reward" },
  { href: "/docs/risk", label: "Risk Management", icon: ShieldCheck, keywords: "risk mdd drawdown limit stop loss expectancy calculator" },
  { href: "/docs/brokers", label: "Brokers & Connections", icon: CreditCard, keywords: "broker alpaca tradestation keys api secret" },
  { href: "/docs/glossary", label: "Glossary", icon: BookBookmark, keywords: "terms definitions pnl rvol spread liquidity slippage" },
];

export function DocsSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = DOC_PAGES.filter(page => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    return page.label.toLowerCase().includes(lowerQuery) || page.keywords.includes(lowerQuery);
  });

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative flex items-center">
        <MagnifyingGlass size={16} className="absolute left-3 text-fg-subtle" weight="bold" />
        <input
          type="text"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-base border border-line rounded-[var(--radius-control)] pl-9 pr-4 py-2 text-sm text-fg focus:outline-none focus:border-accent transition-colors placeholder:text-fg-muted"
        />
      </div>

      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-line rounded-[var(--radius-card)] shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {results.length > 0 ? (
            <div className="p-2 space-y-1">
              {results.map(result => {
                const Icon = result.icon;
                return (
                  <Link
                    key={result.href}
                    href={result.href}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-control)] hover:bg-base text-sm font-medium text-fg-subtle hover:text-fg transition-colors"
                  >
                    <Icon size={16} className="text-accent" />
                    {result.label}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-fg-muted">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
