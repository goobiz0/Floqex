"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  SquaresFour,
  Robot,
  Notebook,
  Flask,
  ChartBar,
  Wallet,
  CreditCard,
  UserCircle,
  Gear,
  type Icon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type Command = { label: string; href: string; icon: Icon; keywords?: string };

// Internal product paths; the proxy serves these natively on the product host.
const COMMANDS: Command[] = [
  { label: "Dashboard", href: "/dashboard", icon: SquaresFour, keywords: "overview home equity" },
  { label: "Bots", href: "/dashboard/bots", icon: Robot, keywords: "start stop status" },
  { label: "Journal", href: "/dashboard/journal", icon: Notebook, keywords: "trades calendar history" },
  { label: "Strategy Lab", href: "/dashboard/strategy", icon: Flask, keywords: "parameters risk orb" },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartBar, keywords: "performance metrics" },
  { label: "Accounts", href: "/dashboard/accounts", icon: Wallet, keywords: "broker connect balance" },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, keywords: "plan upgrade invoice" },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle, keywords: "personal name" },
  { label: "Settings", href: "/dashboard/settings", icon: Gear, keywords: "notifications export danger" },
];

/** ⌘K command palette: real keyboard-driven navigation across the product. */
export function CommandPalette() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else openPalette();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);

  // Focus the input when the palette opens (DOM side effect only).
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const results = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return COMMANDS;
    return COMMANDS.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(s));
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) go(r.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search and navigate"
        className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface pl-2.5 pr-2 text-fg-subtle transition-colors hover:border-line-strong hover:text-fg sm:w-48 sm:justify-start"
      >
        <MagnifyingGlass size={15} />
        <span className="hidden flex-1 text-left text-xs sm:inline">Search</span>
        <kbd className="hidden items-center gap-0.5 rounded-[6px] border border-line bg-base px-1.5 py-0.5 font-mono text-[0.65rem] text-fg-faint sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              className="relative w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-xl)]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-center gap-2.5 border-b border-line px-4">
                <MagnifyingGlass size={18} className="shrink-0 text-fg-faint" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onInputKeyDown}
                  placeholder="Go to…"
                  className="h-12 w-full bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
                />
              </div>
              <ul className="max-h-72 overflow-y-auto p-2">
                {results.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <li key={r.href}>
                      <button
                        type="button"
                        onClick={() => go(r.href)}
                        onMouseMove={() => setActive(i)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm transition-colors",
                          i === active ? "bg-surface text-fg" : "text-fg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]",
                            i === active ? "bg-accent-soft text-accent" : "text-fg-subtle",
                          )}
                        >
                          <Icon size={16} weight={i === active ? "fill" : "regular"} />
                        </span>
                        {r.label}
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-fg-subtle">No matches.</li>
                ) : null}
              </ul>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
