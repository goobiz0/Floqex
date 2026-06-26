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
  Bell,
  Calculator,
  CalendarBlank,
  Gear,
  Plug,
  Plus,
  Star,
  MagicWand,
  Scales,
  Target,
  Percent,
  ChartLineUp,
  TrendDown,
  Lifebuoy,
  ShieldCheck,
  type Icon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type Section = "Navigate" | "Calculators" | "Analytics & stats" | "Actions" | "Settings";

type Command = { label: string; href: string; icon: Icon; section: Section; keywords?: string; hint?: string };

const SECTION_ORDER: Section[] = ["Navigate", "Calculators", "Analytics & stats", "Actions", "Settings"];

// A single flat catalogue, grouped at render time. Calculators are deep-linked
// via ?calc=<id> (the calculators view opens that tool directly), and the
// analytics/stats rows let a user search for a metric by name.
const COMMANDS: Command[] = [
  // Navigate
  { label: "Dashboard", href: "/dashboard", icon: SquaresFour, section: "Navigate", keywords: "overview home equity widgets" },
  { label: "Bots", href: "/dashboard/bots", icon: Robot, section: "Navigate", keywords: "start stop status engine" },
  { label: "Strategy Hub", href: "/dashboard/strategy", icon: Flask, section: "Navigate", keywords: "parameters risk tuning lab" },
  { label: "Markets", href: "/dashboard/markets", icon: ChartLineUp, section: "Navigate", keywords: "quotes symbols search instruments price" },
  { label: "Accounts", href: "/dashboard/accounts", icon: Wallet, section: "Navigate", keywords: "broker connect balance" },

  // Calculators (deep links into the calculators view)
  { label: "Position Size", href: "/dashboard/calculators?calc=position-size", icon: Scales, section: "Calculators", keywords: "units lot sizing risk notional" },
  { label: "Risk / Reward", href: "/dashboard/calculators?calc=risk-reward", icon: Target, section: "Calculators", keywords: "rr ratio breakeven win rate payoff" },
  { label: "ATR Stop & Target", href: "/dashboard/calculators?calc=atr-stop-target", icon: Target, section: "Calculators", keywords: "atr volatility stop target" },
  { label: "Leverage & Margin", href: "/dashboard/calculators?calc=leverage-margin", icon: Calculator, section: "Calculators", keywords: "leverage margin liquidation futures" },
  { label: "Profit & Loss", href: "/dashboard/calculators?calc=profit-loss", icon: Calculator, section: "Calculators", keywords: "pnl profit loss return fees roi r multiple" },
  { label: "Break-even", href: "/dashboard/calculators?calc=breakeven", icon: Calculator, section: "Calculators", keywords: "breakeven fees spread slippage cost" },
  { label: "Kelly Criterion", href: "/dashboard/calculators?calc=kelly", icon: Percent, section: "Calculators", keywords: "kelly optimal fraction bet sizing growth" },
  { label: "Expectancy", href: "/dashboard/calculators?calc=expectancy", icon: ChartLineUp, section: "Calculators", keywords: "expectancy edge profit factor expected value" },
  { label: "Required Win Rate", href: "/dashboard/calculators?calc=required-win-rate", icon: Percent, section: "Calculators", keywords: "win rate breakeven payoff hit rate" },
  { label: "Monte Carlo Simulation", href: "/dashboard/calculators?calc=monte-carlo", icon: Calculator, section: "Calculators", keywords: "monte carlo simulation risk of ruin probability" },
  { label: "Compounding Projection", href: "/dashboard/calculators?calc=compounding", icon: ChartLineUp, section: "Calculators", keywords: "compound growth projection contributions" },
  { label: "Drawdown Recovery", href: "/dashboard/calculators?calc=drawdown-recovery", icon: Lifebuoy, section: "Calculators", keywords: "drawdown recovery loss breakeven" },

  // Analytics & stats (search a metric by name)
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartBar, section: "Analytics & stats", keywords: "performance metrics stats" },
  { label: "Win rate", href: "/dashboard/analytics", icon: Percent, section: "Analytics & stats", keywords: "win rate success ratio metric stat" },
  { label: "Profit & loss (P&L)", href: "/dashboard/analytics", icon: ChartLineUp, section: "Analytics & stats", keywords: "pnl profit loss performance metric stat net" },
  { label: "Drawdown", href: "/dashboard/analytics", icon: TrendDown, section: "Analytics & stats", keywords: "drawdown risk loss peak metric stat" },
  { label: "Equity curve", href: "/dashboard", icon: ChartLineUp, section: "Analytics & stats", keywords: "equity balance curve growth chart" },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarBlank, section: "Analytics & stats", keywords: "calendar daily monthly yearly pnl heatmap" },
  { label: "Trade history", href: "/dashboard/trades", icon: Notebook, section: "Analytics & stats", keywords: "trades history executions positions" },
  { label: "Journal", href: "/dashboard/journal", icon: Notebook, section: "Analytics & stats", keywords: "journal notes trades calendar" },

  // Actions
  { label: "New bot", href: "/dashboard/bots/new", icon: Plus, section: "Actions", keywords: "create start deploy bot" },
  { label: "Connect a broker", href: "/dashboard/accounts/new", icon: Plug, section: "Actions", keywords: "connect broker account add new live" },
  { label: "Generate a strategy with AI", href: "/dashboard/strategy?view=builder", icon: MagicWand, section: "Actions", keywords: "ai strategy builder generate create new" },
  { label: "Upgrade plan", href: "/dashboard/billing", icon: Star, section: "Actions", keywords: "upgrade plan subscription pay pro elite" },

  // Settings
  { label: "Settings", href: "/dashboard/settings", icon: Gear, section: "Settings", keywords: "preferences general" },
  { label: "Security & password", href: "/dashboard/settings", icon: ShieldCheck, section: "Settings", keywords: "password 2fa security delete account reset paper" },
  { label: "Notifications", href: "/dashboard/settings", icon: Bell, section: "Settings", keywords: "notifications discord email sms alerts webhook" },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, section: "Settings", keywords: "plan invoice payment subscription" },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle, section: "Settings", keywords: "personal name avatar" },
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

  // Flat, ranked result list. Label matches rank above keyword-only matches so
  // typing "win rate" surfaces the metric before tangential calculators.
  const results = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return COMMANDS;
    const scored = COMMANDS.map((c) => {
      const label = c.label.toLowerCase();
      const hay = `${label} ${c.keywords ?? ""}`;
      if (!hay.includes(s)) return null;
      const score = label.startsWith(s) ? 0 : label.includes(s) ? 1 : 2;
      return { c, score };
    }).filter((x): x is { c: Command; score: number } => x !== null);
    scored.sort((a, b) => a.score - b.score);
    return scored.map((x) => x.c);
  }, [query]);

  // Group the flat results by section for display while keeping a single
  // running index so arrow-key navigation stays linear across groups.
  const groups = useMemo(() => {
    let idx = 0;
    return SECTION_ORDER.map((section) => {
      const items = results
        .filter((r) => r.section === section)
        .map((r) => ({ cmd: r, index: idx++ }));
      return { section, items };
    }).filter((g) => g.items.length > 0);
  }, [results]);

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
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] border border-line bg-surface text-fg-subtle transition-colors hover:border-line-strong hover:text-fg sm:w-full sm:max-w-md sm:min-w-[18rem] sm:justify-start sm:gap-2 sm:pl-3 sm:pr-2"
      >
        <MagnifyingGlass size={15} />
        <span className="hidden flex-1 text-left text-xs sm:inline">Search pages, calculators, stats…</span>
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
                  placeholder="Search pages, calculators, actions, stats…"
                  className="h-12 w-full bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
                />
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {groups.map((group) => (
                  <div key={group.section} className="mb-1 last:mb-0">
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-faint">
                      {group.section}
                    </p>
                    <ul>
                      {group.items.map(({ cmd, index }) => {
                        const Icon = cmd.icon;
                        return (
                          <li key={`${cmd.label}-${cmd.href}`}>
                            <button
                              type="button"
                              onClick={() => go(cmd.href)}
                              onMouseMove={() => setActive(index)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm transition-colors",
                                index === active ? "bg-surface text-fg" : "text-fg-muted",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]",
                                  index === active ? "bg-accent-soft text-accent" : "text-fg-subtle",
                                )}
                              >
                                <Icon size={16} weight={index === active ? "fill" : "regular"} />
                              </span>
                              {cmd.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {results.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-fg-subtle">No matches.</p>
                ) : null}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
