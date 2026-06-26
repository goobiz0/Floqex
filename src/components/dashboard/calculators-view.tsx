"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  CALCULATORS,
  CATEGORIES,
  getCalculator,
  type CalcCategoryId,
  type CalcMeta,
} from "./calculators/registry";

type Filter = "all" | CalcCategoryId;

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...CATEGORIES.map((c) => ({ value: c.id as Filter, label: c.label })),
];

export function CalculatorsView({
  defaultBalance,
  initialCalc,
}: {
  defaultBalance: number;
  initialCalc?: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<CalcMeta | null>(() => getCalculator(initialCalc) ?? null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  function syncUrl(calcId: string | null) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (calcId) params.set("calc", calcId);
    else params.delete("calc");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }

  function open(calc: CalcMeta) {
    setActive(calc);
    syncUrl(calc.id);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  function back() {
    setActive(null);
    syncUrl(null);
  }

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    return CALCULATORS.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.blurb} ${c.keywords ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter !== "all" && c.category !== filter) return false;
      return true;
    });
  }, [q, filter]);

  if (active) {
    const Comp = active.component;
    const Icon = active.icon;
    return (
      <motion.div
        key={active.id}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-5"
      >
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft size={16} /> All calculators
        </button>

        <header className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
            <Icon size={24} weight="duotone" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-fg">{active.name}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">{active.description}</p>
          </div>
        </header>

        <Comp defaultBalance={defaultBalance} />
      </motion.div>
    );
  }

  const visibleCategories = CATEGORIES.filter((cat) => matches.some((m) => m.category === cat.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Calculators</h1>
        <p className="mt-1 text-sm text-fg-muted">
          A precision toolkit for sizing risk, pricing trades and stress-testing your edge. Defaults pull from your active account where possible.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calculators"
            icon={<MagnifyingGlass />}
            aria-label="Search calculators"
          />
        </div>
        <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} size="sm" />
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface/30 p-12 text-center">
          <p className="text-sm font-medium text-fg-muted">No calculators match &ldquo;{query}&rdquo;</p>
          <p className="mt-1 text-xs text-fg-subtle">Try a different term, or clear the search to see all tools.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleCategories.map((cat) => {
            const items = matches.filter((m) => m.category === cat.id);
            const CatIcon = cat.icon;
            return (
              <section key={cat.id} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-surface text-fg-muted">
                    <CatIcon size={16} weight="duotone" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-fg">{cat.label}</h2>
                  </div>
                  <span className="tnum ml-auto text-xs text-fg-faint">{items.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((calc, i) => (
                    <CalcCard key={calc.id} calc={calc} index={i} reduce={!!reduce} onOpen={() => open(calc)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalcCard({
  calc,
  index,
  reduce,
  onOpen,
}: {
  calc: CalcMeta;
  index: number;
  reduce: boolean;
  onOpen: () => void;
}) {
  const Icon = calc.icon;
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.18), ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-elevated p-4 text-left shadow-[var(--shadow-sm)]",
        "transition-[transform,border-color] duration-150 ease-[var(--ease-out)] hover:-translate-y-[1px] hover:border-line-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent transition-colors">
        <Icon size={20} weight="duotone" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-fg">{calc.name}</h3>
        <p className="mt-0.5 text-[13px] leading-relaxed text-fg-subtle">{calc.blurb}</p>
      </div>
      <CaretRight size={16} className="mt-0.5 shrink-0 text-fg-faint transition-colors group-hover:text-fg-muted" />
    </motion.button>
  );
}
