"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Copy,
  Lightning,
  UsersThree,
  ArrowsClockwise,
  Pause,
  Play,
  PencilSimple,
  Trash,
  ShieldCheck,
  Info,
  ArrowRight,
  Pulse,
  CheckCircle,
  XCircle,
  MinusCircle,
  CaretDown,
  Funnel,
  Gauge,
  Ruler,
  Warning,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { DisplayValue } from "@/components/ui/display-value";
import { DashboardEmptyState } from "@/components/dashboard/states";
import { CopyTradingDiagram } from "@/components/dashboard/copy-trading-diagram";
import { CopyEquitySparkline } from "@/components/dashboard/copy-equity-sparkline";
import { CopyLinkEditor } from "@/components/dashboard/copy-link-editor";
import { cn } from "@/lib/utils";
import { SIZING_MODE_LABEL, shortAccountId } from "@/lib/copy-trading";
import type { CopyTradingData, CopyLinkRow, CopyAccountLite } from "@/lib/queries";
import { toggleCopyLink, deleteCopyLink } from "@/app/dashboard/copy-trading/actions";

type ActivityFilter = "ALL" | "FILLED" | "SKIPPED" | "FAILED";

/** Deterministic UTC formatting so server and client markup always match. */
function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
}
function formatUtcTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" }) + " UTC";
}

export function CopyTradingView({ data }: { data: CopyTradingData }) {
  const router = useRouter();
  const { accounts, links, recentEvents, stats } = data;
  const [dialog, setDialog] = useState<{ mode: "new" } | { mode: "edit"; link: CopyLinkRow } | null>(null);
  const [pending, startTransition] = useTransition();

  const canCreate = accounts.length >= 2;

  function openEdit(id: string) {
    const link = links.find((l) => l.id === id);
    if (link) setDialog({ mode: "edit", link });
  }

  function runToggle(link: CopyLinkRow) {
    startTransition(async () => {
      const res = await toggleCopyLink(link.id);
      if (res.ok) {
        toast.success(link.status === "ACTIVE" ? "Copy link paused." : "Copy link resumed.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not change the link.");
      }
    });
  }

  function runDelete(link: CopyLinkRow) {
    if (!confirm(`Remove the copy link from ${link.master.nickname} to ${link.follower.nickname}? Open copied trades are left untouched.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteCopyLink(link.id);
      if (res.ok) {
        toast.success("Copy link removed.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not remove the link.");
      }
    });
  }

  const armed = stats.activeLinks > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-fg">Copy Trading</h1>
            <Badge tone="accent">
              <Lightning size={12} weight="fill" /> Pro feature
            </Badge>
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-fg-muted">
              <StatusDot tone={armed ? "positive" : "neutral"} pulse={armed} />
              {armed ? "Engine armed" : "Idle"}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-fg-subtle">
            Mirror every trade from a master account onto your follower accounts automatically, across any broker.
            Each link carries its own sizing, risk caps, filters, and a daily-loss breaker.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setDialog({ mode: "new" })}
          disabled={!canCreate}
          title={canCreate ? undefined : "Connect at least two accounts to create a copy link."}
        >
          <Plus weight="bold" /> New copy link
        </Button>
      </div>

      {/* Hero performance band */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PerformanceCard stats={stats} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <StatTile label="Active links" valueNode={<span className="tnum text-fg">{stats.activeLinks}</span>} sub={`of ${stats.totalLinks} total`} icon={<Pulse size={15} weight="duotone" />} />
          <StatTile label="Connected accounts" valueNode={<span className="tnum text-fg">{stats.followerAccounts + stats.masterAccounts}</span>} sub={`${stats.masterAccounts} master${stats.masterAccounts === 1 ? "" : "s"}, ${stats.followerAccounts} follower${stats.followerAccounts === 1 ? "" : "s"}`} icon={<UsersThree size={15} weight="duotone" />} />
          <StatTile label="Copied today (UTC)" valueNode={<span className="tnum text-fg">{stats.copiedToday}</span>} sub={`${stats.totalCopied} routed all time`} icon={<Copy size={15} weight="duotone" />} />
        </div>
      </div>

      {/* Compliance / risk note */}
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface/40 px-4 py-3">
        <ShieldCheck size={18} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-fg-subtle">
          Copy trading replicates orders across accounts, so it multiplies both gains and losses. Followers can sit on
          different brokers and account sizes. Use proportional sizing, a max risk cap, and a daily-loss limit to keep
          exposure aligned. Past performance does not guarantee future results. You stay responsible for every linked
          account.
        </p>
      </div>

      {/* Diagram */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">Connection map</h2>
            <p className="text-xs text-fg-subtle">Master accounts on the left flow trades to their followers on the right.</p>
          </div>
          {links.length > 0 && (
            <div className="hidden items-center gap-4 text-[11px] text-fg-subtle sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-accent" /> Active
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-line-strong" /> Paused
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowsClockwise size={12} /> Reverse
              </span>
            </div>
          )}
        </div>
        {links.length > 0 ? (
          <CopyTradingDiagram links={links} onEditLink={openEdit} />
        ) : (
          <DiagramEmpty canCreate={canCreate} onNew={() => setDialog({ mode: "new" })} />
        )}
      </Card>

      {/* Links list */}
      {links.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-fg">Links</h2>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {links.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                pending={pending}
                onEdit={() => setDialog({ mode: "edit", link })}
                onToggle={() => runToggle(link)}
                onDelete={() => runDelete(link)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      {recentEvents.length > 0 && <ActivityFeed events={recentEvents} />}

      {dialog && (
        <CopyLinkEditor
          mode={dialog.mode}
          link={dialog.mode === "edit" ? dialog.link : null}
          accounts={accounts}
          links={links}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------- Performance card */

function PerformanceCard({ stats }: { stats: CopyTradingData["stats"] }) {
  const pnl = stats.realizedPnl;
  const hasHistory = stats.pnlSeries.some((p) => p.pnl !== 0) || pnl !== 0;
  return (
    <Card className="relative overflow-hidden p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">Copied profit and loss</p>
          <p className={cn("tnum mt-1 text-3xl font-semibold tracking-tight", pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg")}>
            <DisplayValue type="PNL" money={pnl} />
          </p>
          <p className="mt-0.5 text-[11px] text-fg-faint">Realized on follower accounts, all time</p>
        </div>
        <div className="flex gap-5">
          <HeroMetric label="Win rate" value={stats.winRate === null ? "—" : `${Math.round(stats.winRate * 100)}%`} />
          <HeroMetric label="Open copies" value={`${stats.openCopies}`} />
        </div>
      </div>

      <div className="mt-4">
        {hasHistory ? (
          <CopyEquitySparkline data={stats.pnlSeries} height={64} />
        ) : (
          <div className="flex h-16 items-center rounded-[var(--radius-control)] border border-dashed border-line px-3 text-[11px] text-fg-subtle">
            Your copied P&L trajectory appears here once linked trades start closing.
          </div>
        )}
        <p className="mt-1.5 text-[10px] uppercase tracking-wider text-fg-faint">Last 14 days</p>
      </div>
    </Card>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="tnum mt-1 text-lg font-semibold text-fg">{value}</p>
    </div>
  );
}

function StatTile({ label, valueNode, sub, icon }: { label: string; valueNode: React.ReactNode; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
        <span className="text-fg-faint">{icon}</span>
      </div>
      <div className="tnum mt-2 text-lg font-semibold">{valueNode}</div>
      {sub && <p className="mt-0.5 text-[11px] text-fg-faint">{sub}</p>}
    </div>
  );
}

/* ----------------------------------------------------------- Diagram empty */

function DiagramEmpty({ canCreate, onNew }: { canCreate: boolean; onNew: () => void }) {
  return (
    <DashboardEmptyState
      title="No connections yet"
      message={
        canCreate
          ? "Link a master account to one or more followers. When the master's bot trades, the engine mirrors the order to every active follower, sized to your rule."
          : "Connect at least two accounts first. Then choose which one leads and which ones follow its trades."
      }
      action={
        canCreate ? (
          <Button onClick={onNew}>
            <Plus weight="bold" /> Create your first link
          </Button>
        ) : (
          <Button href="/dashboard/accounts">
            <Plus weight="bold" /> Add an account
          </Button>
        )
      }
    />
  );
}

/* -------------------------------------------------------------- Link card */

function LinkCard({
  link,
  pending,
  onEdit,
  onToggle,
  onDelete,
}: {
  link: CopyLinkRow;
  pending: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = link.status === "ACTIVE";
  const followerNeedsBot = !link.follower.hasBot;
  const a = link.analytics;

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AccountChip account={link.master} role="master" />
          <ArrowRight size={16} weight="bold" className="shrink-0 text-fg-subtle" />
          <AccountChip account={link.follower} role="follower" />
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-fg-muted">
          <StatusDot tone={active ? "positive" : "neutral"} pulse={active} />
          {active ? "Active" : "Paused"}
        </span>
      </div>

      {/* Breaker / pause notice */}
      {!active && link.pausedReason && (
        <p className="mt-3 inline-flex items-start gap-1.5 rounded-[var(--radius-control)] bg-warning-soft px-2.5 py-1.5 text-[11px] font-medium leading-snug text-warning">
          <Warning size={13} weight="fill" className="mt-px shrink-0" /> {link.pausedReason}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="neutral">{SIZING_MODE_LABEL[link.sizingMode]}</Badge>
        {link.sizingMode === "FIXED" ? (
          <Badge tone="neutral" mono>{link.fixedUnits ?? 0} units</Badge>
        ) : link.sizingMode !== "MIRROR" ? (
          <Badge tone="neutral" mono>{link.multiplier}x</Badge>
        ) : null}
        {link.reverse && (
          <Badge tone="warning">
            <ArrowsClockwise size={11} weight="bold" /> Reverse
          </Badge>
        )}
        {link.maxRiskPct !== null && (
          <Badge tone="neutral" mono>
            <ShieldCheck size={11} weight="bold" /> Max {link.maxRiskPct}%
          </Badge>
        )}
        {(link.minUnits !== null || link.maxUnits !== null) && (
          <Badge tone="neutral" mono>
            <Ruler size={11} weight="bold" /> {sizeBoundLabel(link)}
          </Badge>
        )}
        {link.maxDailyLossPct !== null && (
          <Badge tone="neutral" mono>
            <Gauge size={11} weight="bold" /> Stop {link.maxDailyLossPct}%/day
          </Badge>
        )}
        {link.symbolFilter && (
          <Badge tone="neutral">
            <Funnel size={11} weight="bold" /> {link.symbolFilterMode === "DENY" ? "Block" : "Only"} {link.symbolFilter}
          </Badge>
        )}
        {!link.copyClose && <Badge tone="neutral">Entries only</Badge>}
      </div>

      {followerNeedsBot && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-warning-soft px-2.5 py-1.5 text-[11px] font-medium text-warning">
          <Info size={13} weight="fill" /> Follower has no bot yet, so copies are skipped until you connect one.
        </p>
      )}

      {/* Expandable analytics */}
      {open && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-[var(--radius-control)] border border-line bg-surface/40 p-3 sm:grid-cols-4">
          <MiniStat label="Realized" node={<PnlText value={a.realizedPnl} />} />
          <MiniStat label="Win rate" node={<span className="tnum text-fg">{a.winRate === null ? "—" : `${Math.round(a.winRate * 100)}%`}</span>} sub={a.closed > 0 ? `${a.wins}/${a.closed}` : "no closes"} />
          <MiniStat label="Open copies" node={<span className="tnum text-fg">{a.openCopies}</span>} />
          <MiniStat label="Today" node={<PnlText value={a.todayPnl} />} />
          {link.maxDailyLossPct !== null && (
            <div className="col-span-2 sm:col-span-4">
              <DailyLossMeter link={link} />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-[var(--radius-control)] text-[11px] font-medium text-fg-subtle transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <CaretDown size={12} weight="bold" className={cn("transition-transform", open && "rotate-180")} />
          {link.copiedCount} copied{link.lastCopiedAt ? ` · last ${formatUtcDate(link.lastCopiedAt)}` : ""}
        </button>
        <div className="flex items-center gap-1">
          <IconButton label={active ? "Pause" : "Resume"} onClick={onToggle} disabled={pending}>
            {active ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" />}
          </IconButton>
          <IconButton label="Edit" onClick={onEdit} disabled={pending}>
            <PencilSimple size={15} />
          </IconButton>
          <IconButton label="Remove" onClick={onDelete} disabled={pending} danger>
            <Trash size={15} />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}

function sizeBoundLabel(link: CopyLinkRow): string {
  if (link.minUnits !== null && link.maxUnits !== null) return `${link.minUnits} to ${link.maxUnits}`;
  if (link.minUnits !== null) return `min ${link.minUnits}`;
  return `max ${link.maxUnits}`;
}

function MiniStat({ label, node, sub }: { label: string; node: React.ReactNode; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold">{node}</p>
      {sub && <p className="tnum text-[10px] text-fg-faint">{sub}</p>}
    </div>
  );
}

function PnlText({ value }: { value: number }) {
  return (
    <span className={cn("tnum", value > 0 ? "text-profit" : value < 0 ? "text-negative" : "text-fg-muted")}>
      <DisplayValue type="PNL" money={value} />
    </span>
  );
}

function DailyLossMeter({ link }: { link: CopyLinkRow }) {
  const limit = link.maxDailyLossPct !== null ? (link.maxDailyLossPct / 100) * link.follower.balance : 0;
  const loss = link.analytics.todayLoss;
  const pct = limit > 0 ? Math.min(1, loss / limit) : 0;
  const near = pct >= 0.75;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-medium">
        <span className="uppercase tracking-wider text-fg-subtle">Daily loss budget</span>
        <span className={cn("tnum", near ? "text-negative" : "text-fg-muted")}>
          {loss > 0 ? `$${loss.toFixed(0)}` : "$0"} / ${limit.toFixed(0)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Daily loss budget used">
        <div className={cn("h-full rounded-[var(--radius-pill)] transition-all", near ? "bg-negative" : "bg-accent")} style={{ width: `${Math.max(pct * 100, loss > 0 ? 4 : 0)}%` }} />
      </div>
    </div>
  );
}

function AccountChip({ account, role }: { account: CopyAccountLite; role: "master" | "follower" }) {
  const isMaster = role === "master";
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-1">
      <span className={cn("flex h-4 w-4 items-center justify-center rounded-[5px]", isMaster ? "bg-accent-soft text-accent" : "bg-elevated text-fg-muted")}>
        {isMaster ? <Lightning size={10} weight="fill" /> : <Copy size={10} weight="fill" />}
      </span>
      <span className="truncate text-xs font-medium text-fg">{account.nickname}</span>
      <span className="tnum hidden text-[10px] text-fg-faint sm:inline">{shortAccountId(account.id)}</span>
    </span>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-fg-subtle transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
        danger && "hover:bg-negative-soft hover:text-negative",
      )}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- Activity */

function ActivityFeed({ events }: { events: CopyTradingData["recentEvents"] }) {
  const [filter, setFilter] = useState<ActivityFilter>("ALL");
  const filtered = useMemo(
    () => (filter === "ALL" ? events : events.filter((e) => e.status === filter)),
    [events, filter],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Replication activity</h2>
        <Segmented<ActivityFilter>
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All" },
            { value: "FILLED", label: "Filled" },
            { value: "SKIPPED", label: "Skipped" },
            { value: "FAILED", label: "Failed" },
          ]}
        />
      </div>
      <Card className="divide-y divide-line overflow-hidden p-0">
        {filtered.length > 0 ? (
          filtered.map((e) => <ActivityRow key={e.id} event={e} />)
        ) : (
          <p className="px-4 py-8 text-center text-xs text-fg-subtle">No {filter.toLowerCase()} events in the recent window.</p>
        )}
      </Card>
    </div>
  );
}

function ActivityRow({ event }: { event: CopyTradingData["recentEvents"][number] }) {
  const statusMeta =
    event.status === "FILLED"
      ? { icon: <CheckCircle size={16} weight="fill" className="text-profit" /> }
      : event.status === "SKIPPED"
        ? { icon: <MinusCircle size={16} weight="fill" className="text-fg-subtle" /> }
        : { icon: <XCircle size={16} weight="fill" className="text-negative" /> };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface/40">
      <span className="shrink-0">{statusMeta.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-fg">
          <span className="font-medium">{event.action === "OPEN" ? "Opened" : "Closed"}</span>{" "}
          <span
            className={cn(
              "tnum rounded-[var(--radius-pill)] px-1.5 py-px text-[11px] font-medium",
              event.direction === "LONG" ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
            )}
          >
            {event.direction}
          </span>{" "}
          {event.instrument}
          {event.sizeUnits !== null ? <span className="tnum text-fg-muted"> · {event.sizeUnits} units</span> : null}
        </p>
        <p className="truncate text-[11px] text-fg-subtle">
          {event.masterNickname} to {event.followerNickname}
          {event.reason ? ` · ${event.reason}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {event.pnl !== null && (
          <p className={cn("tnum text-[13px] font-medium", event.pnl > 0 ? "text-profit" : event.pnl < 0 ? "text-negative" : "text-fg-muted")}>
            <DisplayValue type="PNL" money={event.pnl} />
          </p>
        )}
        <p className="text-[10px] text-fg-faint">{formatUtcTime(event.createdAt)}</p>
      </div>
    </div>
  );
}
