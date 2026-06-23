"use client";

import { useState, useRef, useEffect } from "react";
import { MagnifyingGlass, BookBookmark, Strategy, RocketLaunch, ShieldCheck, CreditCard } from "@phosphor-icons/react";
import Link from "next/link";
import { DOCS_INDEX } from "./docs-index";

const ICONS: Record<string, React.ElementType> = {
  RocketLaunch,
  Strategy,
  ShieldCheck,
  CreditCard,
  BookBookmark
};

export function DocsSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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

  const results = [];
  if (query.length > 1) {
    const lowerQuery = query.toLowerCase();
    for (const page of DOCS_INDEX) {
      let pageMatched = false;
      
      // Match against page title
      if (page.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          href: page.href,
          title: page.title,
          iconName: page.iconName,
          snippet: "Match in page title"
        });
        pageMatched = true;
      }
      
      // Match against sections
      if (!pageMatched) {
        for (const section of page.sections) {
          if (section.heading.toLowerCase().includes(lowerQuery) || section.content.toLowerCase().includes(lowerQuery)) {
            // Find a small snippet around the match
            const matchIndex = section.content.toLowerCase().indexOf(lowerQuery);
            let snippet = section.content;
            if (matchIndex > -1) {
              const start = Math.max(0, matchIndex - 30);
              const end = Math.min(section.content.length, matchIndex + lowerQuery.length + 30);
              snippet = (start > 0 ? "..." : "") + section.content.substring(start, end) + (end < section.content.length ? "..." : "");
            } else {
              snippet = section.content.substring(0, 80) + "..."; // Match was in heading
            }
            
            results.push({
              href: `${page.href}#${section.heading.toLowerCase().replace(/\s+/g, '-')}`,
              title: `${page.title} — ${section.heading}`,
              iconName: page.iconName,
              snippet
            });
          }
        }
      }
    }
  }

  // Deduplicate and limit
  const uniqueResults = results.slice(0, 6);

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

      {isOpen && query.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-line rounded-[var(--radius-card)] shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[400px] overflow-y-auto">
          {uniqueResults.length > 0 ? (
            <div className="p-2 space-y-1">
              {uniqueResults.map((result, i) => {
                const Icon = ICONS[result.iconName] || BookBookmark;
                return (
                  <Link
                    key={i}
                    href={result.href}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="flex flex-col gap-1 px-3 py-2.5 rounded-[var(--radius-control)] hover:bg-base transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-accent shrink-0" />
                      <span className="text-sm font-semibold text-fg truncate">{result.title}</span>
                    </div>
                    <span className="text-xs text-fg-subtle line-clamp-2 pl-6">{result.snippet}</span>
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
