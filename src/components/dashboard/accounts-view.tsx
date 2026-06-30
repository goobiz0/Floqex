"use client";

import { useId, useState, useTransition, useEffect, useMemo, ReactNode, useOptimistic } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import {
  Plus,
  Wallet,
  DotsThree,
  Copy,
  MagnifyingGlass,
  SquaresFour,
  Rows,
  ArrowsDownUp,
  CaretDown,
  Check,
  ShieldCheck,
  ArrowSquareOut,
  Trash,
  Warning,
  Info,
  Lightning,
  X,
  Robot,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { DisplayValue } from "@/components/ui/display-value";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  toggleBotStatus,
  disconnectAccount,
  updatePropFirmSettings,
} from "@/app/dashboard/accounts/actions";
import { formatAccountLimit, type Plan } from "@/lib/plans";
import { dashboardUrl } from "@/lib/urls";
import type { AccountsOverview, AccountOverviewRow } from "@/lib/queries";

const NEW_ACCOUNT_HREF = dashboardUrl("/accounts/new");

type ModeFilter = "ALL" | "PAPER" | "LIVE";
type SortKey = "balance" | "today" | "total" | "winRate" | "name" | "recent";
type ViewMode = "grid" | "list";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "balance", label: "Balance" },
  { key: "today", label: "Today's P&L" },
  { key: "total", label: "All-time P&L" },
  { key: "winRate", label: "Win rate" },
  { key: "name", label: "Name" },
  { key: "recent", label: "Recently added" },
];



function pnlTone(v: number | null | undefined): string {
  if (v == null || v === 0) return "text-fg-muted";
  return v > 0 ? "text-profit" : "text-negative";
}

function webhookEnabled(plan: Plan): boolean {
  return plan === "PRO" || plan === "ELITE";
}

export function AccountsView({ data }: { data: AccountsOverview }) {
  const { accounts, plan, accountLimit, totals } = data;

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ModeFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("balance");
  const [view, setView] = useState<ViewMode>("grid");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AccountOverviewRow | null>(null);
  const [disconnecting, startDisconnect] = useTransition();

  const atLimit = Number.isFinite(accountLimit) && accounts.length >= accountLimit;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = accounts.filter((a) => {
      if (mode !== "ALL" && a.mode !== mode) return false;
      if (!q) return true;
      return (
        a.nickname.toLowerCase().includes(q) || a.broker.toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "balance":
          return b.balance - a.balance;
        case "today":
          return (b.todayPnl ?? 0) - (a.todayPnl ?? 0);
        case "total":
          return b.totalPnl - a.totalPnl;
        case "winRate":
          return (b.winRate ?? -1) - (a.winRate ?? -1);
        case "name":
          return a.nickname.localeCompare(b.nickname);
        case "recent":
          return b.createdAt.localeCompare(a.createdAt);
        default:
          return 0;
      }
    });
    return sorted;
  }, [accounts, query, mode, sort]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function confirmDisconnect() {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    const name = confirmTarget.nickname;
    startDisconnect(async () => {
      const res = await disconnectAccount(id);
      if (res.ok) {
        toast.success(`Disconnected ${name}.`);
        setConfirmTarget(null);
        setExpandedId((prev) => (prev === id ? null : prev));
      } else {
        toast.error(res.error ?? "Could not disconnect this account.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <PortfolioSummary
        totals={totals}
        plan={plan}
        accountLimit={accountLimit}
        accounts={accounts}
      />

      {accounts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Controls
            query={query}
            onQuery={setQuery}
            mode={mode}
            onMode={setMode}
            sort={sort}
            onSort={setSort}
            view={view}
            onView={setView}
            atLimit={atLimit}
          />

          {atLimit && <LimitNotice accountLimit={accountLimit} />}

          {visible.length === 0 ? (
            <NoMatches onClear={() => { setQuery(""); setMode("ALL"); }} />
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AnimatePresence initial={false}>
                {visible.map((a) => (
                  <AccountCard
                    key={a.id}
                    account={a}
                    plan={plan}
                    expanded={expandedId === a.id}
                    onToggleExpand={() => toggleExpand(a.id)}
                    onRequestDisconnect={() => setConfirmTarget(a)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <AccountList
              accounts={visible}
              plan={plan}
              expandedId={expandedId}
              onToggleExpand={toggleExpand}
              onRequestDisconnect={(a) => setConfirmTarget(a)}
            />
          )}

        </>
      )}

      <ConfirmDisconnectDialog
        account={confirmTarget}
        pending={disconnecting}
        onCancel={() => !disconnecting && setConfirmTarget(null)}
        onConfirm={confirmDisconnect}
      />
    </div>
  );
}

/* ───────────────────────── Portfolio summary ──────────────────────── */

function PortfolioSummary({
  totals,
  plan,
  accountLimit,
  accounts,
}: {
  totals: AccountsOverview["totals"];
  plan: Plan;
  accountLimit: number;
  accounts: AccountOverviewRow[];
}) {
  const todayPct =
    totals.balance - totals.todayPnl > 0
      ? (totals.todayPnl / (totals.balance - totals.todayPnl)) * 100
      : null;

  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-[90px] motion-reduce:hidden"
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">
              Total balance
            </p>
            <p className="tnum mt-1 text-3xl font-semibold tracking-tight text-fg">
              <DisplayValue type="BALANCE" money={totals.balance} />
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm">
              <span className={cn("tnum font-medium", pnlTone(totals.todayPnl))}>
                <DisplayValue
                  type="PNL"
                  money={totals.todayPnl}
                  percent={todayPct ?? undefined}
                />
              </span>
              <span className="text-fg-subtle">today</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 lg:border-l lg:border-line lg:pl-8">
          <SummaryStat
            label="All-time P&L"
            value={
              <span className={cn("tnum", pnlTone(totals.totalPnl))}>
                <DisplayValue type="PNL" money={totals.totalPnl} />
              </span>
            }
          />
          <SummaryStat
            label="Accounts"
            value={
              <span className="tnum text-fg">
                {totals.accountCount}
                <span className="text-fg-faint">
                  {" / "}
                  {formatAccountLimit(accountLimit)}
                </span>
              </span>
            }
          />
          <SummaryStat
            label="Engines on"
            value={
              <span className="inline-flex items-center gap-1.5 text-fg">
                <StatusDot
                  tone={totals.runningBots > 0 ? "positive" : "neutral"}
                  pulse={totals.runningBots > 0}
                />
                <span className="tnum">{totals.runningBots}</span>
              </span>
            }
          />
          <SummaryStat
            label="Open positions"
            value={<span className="tnum text-fg">{totals.openPositions}</span>}
          />
        </div>
      </div>

      {accounts.length > 1 && totals.balance > 0 && (
        <AllocationBar accounts={accounts} total={totals.balance} />
      )}

      {plan === "FREE" && (
        <p className="relative mt-4 flex items-center gap-1.5 text-xs text-fg-subtle">
          <Info size={13} className="text-fg-faint" />
          Paper accounts use simulated capital. Live trading unlocks on Trader and above.
        </p>
      )}
    </Card>
  );
}

function SummaryStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function AllocationBar({
  accounts,
  total,
}: {
  accounts: AccountOverviewRow[];
  total: number;
}) {
  const ranked = [...accounts]
    .filter((a) => a.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  if (ranked.length === 0) return null;

  // Single emerald accent, varied by opacity so it stays on-brand.
  const shade = (i: number) => Math.max(0.28, 0.92 - i * 0.13);
  const legend = ranked.slice(0, 4);
  const restPct =
    ranked.length > 4
      ? (ranked.slice(4).reduce((s, a) => s + a.balance, 0) / total) * 100
      : 0;

  return (
    <div className="relative mt-6">
      <div className="flex h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface">
        {ranked.map((a, i) => (
          <div
            key={a.id}
            className="h-full first:rounded-l-[var(--radius-pill)] last:rounded-r-[var(--radius-pill)]"
            style={{
              width: `${(a.balance / total) * 100}%`,
              backgroundColor: `rgba(var(--accent-rgb), ${shade(i)})`,
            }}
            title={`${a.nickname}: ${((a.balance / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {legend.map((a, i) => (
          <span key={a.id} className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
            <span
              className="h-2 w-2 rounded-[var(--radius-pill)]"
              style={{ backgroundColor: `rgba(var(--accent-rgb), ${shade(i)})` }}
            />
            <span className="text-fg-muted">{a.nickname}</span>
            <span className="tnum text-fg-faint">{((a.balance / total) * 100).toFixed(0)}%</span>
          </span>
        ))}
        {restPct > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
            <span className="h-2 w-2 rounded-[var(--radius-pill)] bg-line-strong" />
            <span className="text-fg-muted">Other</span>
            <span className="tnum text-fg-faint">{restPct.toFixed(0)}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Controls ───────────────────────────── */

function Controls({
  query,
  onQuery,
  mode,
  onMode,
  sort,
  onSort,
  view,
  onView,
  atLimit,
}: {
  query: string;
  onQuery: (v: string) => void;
  mode: ModeFilter;
  onMode: (v: ModeFilter) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  atLimit: boolean;
}) {
  const modes: { key: ModeFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "PAPER", label: "Paper" },
    { key: "LIVE", label: "Live" },
  ];
  const activeSort = SORTS.find((s) => s.key === sort) ?? SORTS[0];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search accounts"
            aria-label="Search accounts"
            icon={<MagnifyingGlass />}
            className="h-9"
          />
        </div>
        <div
          role="tablist"
          aria-label="Filter by mode"
          className="inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] border border-line bg-elevated p-1"
        >
          {modes.map((m) => {
            const active = m.key === mode;
            return (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onMode(m.key)}
                className={cn(
                  "rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-surface text-fg shadow-[var(--shadow-sm)]"
                    : "text-fg-subtle hover:text-fg",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-xs font-medium text-fg shadow-[var(--shadow-sm)] transition-colors hover:border-line-strong"
            >
              <ArrowsDownUp size={14} className="text-fg-subtle" />
              <span className="hidden sm:inline text-fg-subtle">Sort</span>
              <span>{activeSort.label}</span>
              <CaretDown size={12} className="text-fg-subtle" />
            </button>
          }
          items={SORTS.map((s) => ({
            label: s.label,
            icon:
              s.key === sort ? (
                <Check size={14} className="text-accent" weight="bold" />
              ) : (
                <span className="inline-block h-3.5 w-3.5" />
              ),
            onClick: () => onSort(s.key),
          }))}
        />

        <div
          role="group"
          aria-label="View layout"
          className="inline-flex items-center gap-0.5 rounded-[var(--radius-control)] border border-line bg-elevated p-1"
        >
          <ViewButton
            active={view === "grid"}
            onClick={() => onView("grid")}
            label="Grid view"
          >
            <SquaresFour size={16} weight={view === "grid" ? "fill" : "regular"} />
          </ViewButton>
          <ViewButton
            active={view === "list"}
            onClick={() => onView("list")}
            label="List view"
          >
            <Rows size={16} weight={view === "list" ? "fill" : "regular"} />
          </ViewButton>
        </div>

        {atLimit ? (
          <Button size="sm" disabled className="h-9">
            <Plus size={16} weight="bold" />
            <span className="hidden sm:inline">Add account</span>
          </Button>
        ) : (
          <Button href={NEW_ACCOUNT_HREF} size="sm" className="h-9">
            <Plus size={16} weight="bold" />
            <span className="hidden sm:inline">Add account</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors",
        active
          ? "bg-surface text-accent shadow-[var(--shadow-sm)]"
          : "text-fg-subtle hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

/* ──────────────────────── Account engine hook ─────────────────────── */

type EngineStatus = "RUNNING" | "WAITING" | "STOPPED" | "NONE";

function useEngine(account: AccountOverviewRow) {
  const [pending, startTransition] = useTransition();
  const base: EngineStatus = account.bot ? account.bot.status : "NONE";
  const [status, setStatus] = useOptimistic<EngineStatus, EngineStatus>(
    base,
    (_s, next) => next,
  );
  const isRunning = status === "RUNNING";

  function toggle() {
    if (!account.bot) {
      toast.error("Attach a bot to this account before starting the engine.");
      return;
    }
    startTransition(async () => {
      setStatus(isRunning ? "STOPPED" : "RUNNING");
      const res = await toggleBotStatus(account.id);
      if (!res.ok) toast.error(res.error ?? "Could not toggle the engine.");
    });
  }

  return { pending, status, isRunning, toggle, hasBot: Boolean(account.bot) };
}

function EngineToggle({
  isRunning,
  pending,
  onToggle,
  size = "md",
  ariaLabel,
}: {
  isRunning: boolean;
  pending: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const dims =
    size === "sm"
      ? "h-5 w-9"
      : "h-6 w-11";
  const knob =
    size === "sm"
      ? cn("h-4 w-4", isRunning ? "translate-x-4" : "translate-x-0")
      : cn("h-5 w-5", isRunning ? "translate-x-5" : "translate-x-0");
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isRunning}
      aria-label={ariaLabel ?? (isRunning ? "Stop engine" : "Start engine")}
      disabled={pending}
      onClick={onToggle}
      className={cn(
        "relative shrink-0 rounded-[var(--radius-pill)] ring-1 ring-inset outline-none transition-colors duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        dims,
        isRunning ? "bg-accent ring-accent/60" : "bg-surface ring-line-strong",
        pending && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-0.5 top-1/2 -translate-y-1/2 rounded-[var(--radius-pill)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-transform duration-150 ease-[var(--ease-out)]",
          knob,
        )}
      />
    </button>
  );
}

function EngineLabel({ status }: { status: EngineStatus }) {
  const meta: Record<EngineStatus, { tone: "positive" | "warning" | "neutral" | "negative"; label: string }> = {
    RUNNING: { tone: "positive", label: "Engine running" },
    WAITING: { tone: "warning", label: "Engine waiting" },
    STOPPED: { tone: "neutral", label: "Engine stopped" },
    NONE: { tone: "negative", label: "No bot attached" },
  };
  const m = meta[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <StatusDot tone={m.tone} pulse={status === "RUNNING"} />
      {m.label}
    </span>
  );
}

/* ─────────────────────────── Account card ─────────────────────────── */

function AccountCard({
  account,
  plan,
  expanded,
  onToggleExpand,
  onRequestDisconnect,
}: {
  account: AccountOverviewRow;
  plan: Plan;
  expanded: boolean;
  onToggleExpand: () => void;
  onRequestDisconnect: () => void;
}) {
  const reduce = useReducedMotion();
  const engine = useEngine(account);
  const isLive = account.mode === "LIVE";

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
              <Wallet size={20} weight="fill" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-fg">{account.nickname}</p>
              <p className="truncate text-xs text-fg-subtle">{account.broker}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={isLive ? "warning" : "neutral"}>{isLive ? "Live" : "Paper"}</Badge>
            <AccountMenu
              account={account}
              plan={plan}
              onManage={onToggleExpand}
              onRequestDisconnect={onRequestDisconnect}
            />
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-fg-subtle">Balance</p>
            <p className="tnum mt-0.5 text-2xl font-semibold text-fg">
              <DisplayValue type="BALANCE" money={account.balance} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-fg-subtle">Today</p>
            <p className={cn("tnum mt-0.5 text-sm font-semibold", pnlTone(account.todayPnl))}>
              {account.todayPnl == null ? (
                <span className="text-fg-faint">N/A</span>
              ) : (
                <DisplayValue
                  type="PNL"
                  money={account.todayPnl}
                  percent={
                    account.balance > 0
                      ? (account.todayPnl / account.balance) * 100
                      : undefined
                  }
                />
              )}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <Spark data={account.spark} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-4">
          <MiniStat
            label="All-time"
            value={
              <span className={pnlTone(account.totalPnl)}>
                <DisplayValue type="PNL" money={account.totalPnl} />
              </span>
            }
          />
          <MiniStat
            label="Win rate"
            value={
              account.winRate == null ? (
                <span className="text-fg-faint">N/A</span>
              ) : (
                <span className="text-fg">{account.winRate.toFixed(0)}%</span>
              )
            }
          />
          <MiniStat
            label="Open"
            value={<span className="text-fg">{account.openPositions}</span>}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <EngineLabel status={engine.status} />
          {engine.hasBot ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                {engine.isRunning ? "On" : "Off"}
              </span>
              <EngineToggle
                isRunning={engine.isRunning}
                pending={engine.pending}
                onToggle={engine.toggle}
              />
            </div>
          ) : (
            <Link
              href={dashboardUrl("/bots")}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
            >
              <Robot size={14} weight="fill" />
              Attach bot
            </Link>
          )}
        </div>

        <AdvancedPanel
          account={account}
          plan={plan}
          open={expanded}
          onRequestDisconnect={onRequestDisconnect}
        />

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-fg-subtle transition-colors hover:text-fg"
        >
          {expanded ? "Hide settings" : "Manage settings"}
          <CaretDown
            size={12}
            className={cn("transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
      </Card>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-fg-subtle">{label}</p>
      <p className="tnum mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

/* ─────────────────────────── Account list ─────────────────────────── */

function AccountList({
  accounts,
  plan,
  expandedId,
  onToggleExpand,
  onRequestDisconnect,
}: {
  accounts: AccountOverviewRow[];
  plan: Plan;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onRequestDisconnect: (a: AccountOverviewRow) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="hidden items-center gap-4 border-b border-line px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle sm:flex">
        <span className="min-w-0 flex-1">Account</span>
        <span className="w-28 text-right">Balance</span>
        <span className="hidden w-24 text-right md:block">Today</span>
        <span className="hidden w-24 text-right lg:block">All-time</span>
        <span className="hidden w-16 text-right xl:block">Win</span>
        <span className="w-[120px] text-right">Engine</span>
        <span className="w-7" />
      </div>
      <div className="divide-y divide-line">
        {accounts.map((a) => (
          <AccountRow
            key={a.id}
            account={a}
            plan={plan}
            expanded={expandedId === a.id}
            onToggleExpand={() => onToggleExpand(a.id)}
            onRequestDisconnect={() => onRequestDisconnect(a)}
          />
        ))}
      </div>
    </Card>
  );
}

function AccountRow({
  account,
  plan,
  expanded,
  onToggleExpand,
  onRequestDisconnect,
}: {
  account: AccountOverviewRow;
  plan: Plan;
  expanded: boolean;
  onToggleExpand: () => void;
  onRequestDisconnect: () => void;
}) {
  const reduce = useReducedMotion();
  const engine = useEngine(account);
  const isLive = account.mode === "LIVE";

  return (
    <div className={cn("transition-colors", expanded && "bg-surface/30")}>
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
            <Wallet size={18} weight="fill" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-fg">{account.nickname}</p>
              <Badge tone={isLive ? "warning" : "neutral"} className="hidden sm:inline-flex">
                {isLive ? "Live" : "Paper"}
              </Badge>
            </div>
            <p className="truncate text-xs text-fg-subtle">{account.broker}</p>
          </div>
        </div>

        <div className="w-24 text-right sm:w-28">
          <p className="tnum text-sm font-semibold text-fg">
            <DisplayValue type="BALANCE" money={account.balance} />
          </p>
        </div>
        <div className="hidden w-24 text-right md:block">
          <p className={cn("tnum text-sm font-medium", pnlTone(account.todayPnl))}>
            {account.todayPnl == null ? (
              <span className="text-fg-faint">N/A</span>
            ) : (
              <DisplayValue type="PNL" money={account.todayPnl} />
            )}
          </p>
        </div>
        <div className="hidden w-24 text-right lg:block">
          <p className={cn("tnum text-sm font-medium", pnlTone(account.totalPnl))}>
            <DisplayValue type="PNL" money={account.totalPnl} />
          </p>
        </div>
        <div className="hidden w-16 text-right xl:block">
          <p className="tnum text-sm font-medium text-fg-muted">
            {account.winRate == null ? (
              <span className="text-fg-faint">N/A</span>
            ) : (
              `${account.winRate.toFixed(0)}%`
            )}
          </p>
        </div>

        <div className="flex w-[120px] items-center justify-end gap-2">
          {engine.hasBot ? (
            <>
              <span className="hidden text-[11px] text-fg-subtle sm:inline">
                {engine.isRunning ? "On" : "Off"}
              </span>
              <EngineToggle
                isRunning={engine.isRunning}
                pending={engine.pending}
                onToggle={engine.toggle}
                size="sm"
              />
            </>
          ) : (
            <Link
              href={dashboardUrl("/bots")}
              className="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Attach bot
            </Link>
          )}
        </div>

        <AccountMenu
          account={account}
          plan={plan}
          onManage={onToggleExpand}
          onRequestDisconnect={onRequestDisconnect}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <AdvancedContent
                account={account}
                plan={plan}
                onRequestDisconnect={onRequestDisconnect}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────── Account menu ──────────────────────────── */

function AccountMenu({
  account,
  plan,
  onManage,
  onRequestDisconnect,
}: {
  account: AccountOverviewRow;
  plan: Plan;
  onManage: () => void;
  onRequestDisconnect: () => void;
}) {
  const items: { label: string; onClick: () => void; icon?: ReactNode }[] = [
    {
      label: "Open dashboard",
      icon: <ArrowSquareOut size={16} />,
      onClick: () => {
        window.location.href = `${dashboardUrl("/")}?account=${account.id}`;
      },
    },
    {
      label: "Manage settings",
      icon: <ShieldCheck size={16} />,
      onClick: onManage,
    },
  ];

  if (webhookEnabled(plan)) {
    items.push({
      label: "Copy webhook URL",
      icon: <Copy size={16} />,
      onClick: () => {
        const url = `${window.location.origin}/api/webhooks/tradingview/${account.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Webhook URL copied to clipboard.");
      },
    });
  }

  items.push({ label: "divider", onClick: () => {} });
  items.push({
    label: "Disconnect",
    icon: <Trash size={16} className="text-negative" />,
    onClick: onRequestDisconnect,
  });

  return (
    <Dropdown
      align="right"
      trigger={
        <button
          type="button"
          aria-label="Account actions"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-pill)] text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
        >
          <DotsThree size={20} weight="bold" />
        </button>
      }
      items={items}
    />
  );
}

/* ──────────────────────── Advanced settings ───────────────────────── */

function AdvancedPanel({
  account,
  plan,
  open,
  onRequestDisconnect,
}: {
  account: AccountOverviewRow;
  plan: Plan;
  open: boolean;
  onRequestDisconnect: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-4 border-t border-line pt-4">
            <AdvancedContent
              account={account}
              plan={plan}
              onRequestDisconnect={onRequestDisconnect}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AdvancedContent({
  account,
  plan,
  onRequestDisconnect,
}: {
  account: AccountOverviewRow;
  plan: Plan;
  onRequestDisconnect: () => void;
}) {
  const ddId = useId();
  const [pending, startTransition] = useTransition();
  const [propOn, setPropOn] = useState(account.isPropFirmMode);

  function togglePropFirm() {
    const next = !propOn;
    setPropOn(next);
    startTransition(async () => {
      const res = await updatePropFirmSettings(
        account.id,
        next,
        account.propFirmMaxTrailingDrawdown ?? null,
      );
      if (!res.ok) {
        setPropOn(!next);
        toast.error(res.error ?? "Could not update guardrails.");
      }
    });
  }

  function saveDrawdown(value: string) {
    const val = value ? Number(value) : null;
    if (val != null && (Number.isNaN(val) || !Number.isFinite(val) || val < 0)) {
      toast.error("Enter a valid drawdown amount.");
      return;
    }
    startTransition(async () => {
      const res = await updatePropFirmSettings(account.id, true, val);
      if (res.ok) toast.success("Guardrail updated.");
      else toast.error(res.error ?? "Could not save the guardrail.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-control)] border border-line bg-surface/40 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} weight="fill" className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="text-xs font-medium text-fg">Prop firm guardrails</p>
              <p className="text-[11px] text-fg-subtle">
                Auto-flatten positions before a trailing drawdown limit is breached.
              </p>
            </div>
          </div>
          <EngineToggle
            isRunning={propOn}
            pending={pending}
            onToggle={togglePropFirm}
            size="sm"
            ariaLabel="Toggle prop firm guardrails"
          />
        </div>

        {propOn && (
          <div className="mt-3 space-y-1.5">
            <label htmlFor={ddId} className="block text-[11px] font-medium text-fg-muted">
              Max trailing drawdown (USD)
            </label>
            <Input
              id={ddId}
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="e.g. 2500"
              defaultValue={account.propFirmMaxTrailingDrawdown?.toString() ?? ""}
              className="h-8 text-xs"
              onBlur={(e) => saveDrawdown(e.target.value)}
            />
          </div>
        )}
      </div>

      {webhookEnabled(plan) && <WebhookBox accountId={account.id} />}

      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-negative/30 bg-negative/5 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-negative" />
          <div>
            <p className="text-xs font-medium text-fg">Disconnect account</p>
            <p className="text-[11px] text-fg-subtle">
              Permanently deletes its bot and trading history.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRequestDisconnect}
          className="shrink-0 rounded-[var(--radius-control)] border border-negative/50 px-3 py-1.5 text-xs font-medium text-negative transition-colors hover:bg-negative-soft active:scale-[0.97]"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function WebhookBox({ accountId }: { accountId: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = origin ? `${origin}/api/webhooks/tradingview/${accountId}` : "";
  
  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-surface/40 p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Lightning size={14} weight="fill" className="text-accent" />
        <p className="text-xs font-medium text-fg">TradingView webhook</p>
        <Badge tone="accent" className="ml-auto">
          Pro
        </Badge>
      </div>
      <p className="mb-2 text-[11px] text-fg-subtle">
        Route alerts from your own TradingView strategy straight to this account.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[8px] border border-line bg-surface px-2 py-1.5 text-[11px] text-fg-muted">
          {url}
        </code>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Webhook URL copied to clipboard.");
            } catch {
              toast.error("Failed to copy URL");
            }
          }}
        >
          <Copy size={14} />
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Empty states ─────────────────────────── */

function EmptyState() {
  return (
    <Card className="relative overflow-hidden border-dashed p-12 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:hidden"
      >
        <div className="h-64 w-64 rounded-full bg-accent/10 blur-[80px]" />
      </div>
      <div className="relative mx-auto flex flex-col items-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] border border-line bg-surface text-accent">
          <Wallet size={26} weight="fill" />
        </span>
        <h3 className="text-lg font-semibold text-fg">No accounts connected</h3>
        <p className="mt-1 max-w-sm text-sm text-fg-subtle">
          Connect a paper or live broker account. Each one runs its own isolated bot,
          balance, and trade history.
        </p>
        <Button href={NEW_ACCOUNT_HREF} className="mt-6">
          <Plus size={16} weight="bold" />
          Connect an account
        </Button>
      </div>
    </Card>
  );
}

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center border-dashed p-10 text-center">
      <MagnifyingGlass size={24} className="mb-3 text-fg-faint" />
      <p className="text-sm font-medium text-fg">No accounts match your filters</p>
      <p className="mt-1 text-xs text-fg-subtle">Try a different search or mode.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
      >
        Clear filters
      </button>
    </Card>
  );
}

function LimitNotice({ accountLimit }: { accountLimit: number }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-accent/20 bg-accent-soft/30 p-4 text-sm text-fg">
      <Info size={18} weight="fill" className="mt-0.5 shrink-0 text-accent" />
      <div>
        <p className="font-medium">Account limit reached</p>
        <p className="mt-1 text-fg-muted">
          Your plan covers {formatAccountLimit(accountLimit)} account
          {accountLimit === 1 ? "" : "s"}. Upgrade to connect more brokers and run more
          bots at once.
        </p>
        <Link
          href={dashboardUrl("/billing")}
          className="mt-2 inline-block font-medium text-accent transition-colors hover:text-accent-hover"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────── Disconnect confirm dialog ─────────────────── */

function ConfirmDisconnectDialog({
  account,
  pending,
  onCancel,
  onConfirm,
}: {
  account: AccountOverviewRow | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal needs a client mount before document.body exists
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {account && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Disconnect account"
            className="fixed left-1/2 top-1/2 z-[61] w-[min(94%,440px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-xl)]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line bg-negative/5 px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-negative-soft text-negative">
                  <Warning size={18} weight="fill" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-fg">Disconnect account</h2>
                  <p className="mt-0.5 text-xs text-fg-subtle">This cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close"
                className="text-fg-subtle transition-colors hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <p className="text-sm text-fg-muted">
                Disconnecting{" "}
                <span className="font-medium text-fg">{account.nickname}</span>{" "}
                permanently deletes its bot, open positions, and all trade history.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-negative px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-negative/90 active:scale-[0.97] disabled:opacity-50"
                >
                  {pending ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ───────────────────────────── Sparkline ──────────────────────────── */

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-10 items-center text-[11px] text-fg-faint">
        Equity curve appears once trading begins
      </div>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 28 - ((v - min) / range) * 26;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={up ? "var(--color-profit)" : "var(--color-negative)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
