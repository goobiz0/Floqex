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
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DisplayValue } from "@/components/ui/display-value";
import { DashboardEmptyState } from "@/components/dashboard/states";
import { CopyTradingDiagram } from "@/components/dashboard/copy-trading-diagram";
import { cn } from "@/lib/utils";
import {
  SIZING_MODES,
  SIZING_MODE_LABEL,
  shortAccountId,
  type CopySizingMode,
} from "@/lib/copy-trading";
import type { CopyTradingData, CopyLinkRow, CopyAccountLite } from "@/lib/queries";
import { createCopyLink, updateCopyLink, toggleCopyLink, deleteCopyLink } from "@/app/dashboard/copy-trading/actions";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-fg">Copy Trading</h1>
            <Badge tone="accent">
              <Lightning size={12} weight="fill" /> Pro feature
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-fg-subtle">
            Mirror every trade from a master account onto your follower accounts automatically, across any broker.
            Set the sizing rule per link and the engine routes each copy in real time.
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

      {/* Compliance / risk note */}
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface/40 px-4 py-3">
        <ShieldCheck size={18} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-fg-subtle">
          Copy trading replicates orders across accounts, so it multiplies both gains and losses. Followers can sit on
          different brokers and account sizes; use proportional sizing and a max risk cap to keep exposure aligned. Past
          performance does not guarantee future results. You stay responsible for every linked account.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active links" value={`${stats.activeLinks}`} sub={`of ${stats.totalLinks} total`} icon={<Pulse size={16} weight="duotone" />} />
        <Stat label="Followers" value={`${stats.followerAccounts}`} sub={`${stats.masterAccounts} master${stats.masterAccounts === 1 ? "" : "s"}`} icon={<UsersThree size={16} weight="duotone" />} />
        <Stat label="Copied today" value={`${stats.copiedToday}`} sub={`${stats.totalCopied} all time`} icon={<Copy size={16} weight="duotone" />} />
        <Stat
          label="Copied P&L"
          valueNode={
            <span className={cn("tnum text-lg font-semibold", stats.realizedPnl > 0 ? "text-profit" : stats.realizedPnl < 0 ? "text-negative" : "text-fg")}>
              <DisplayValue type="PNL" money={stats.realizedPnl} />
            </span>
          }
          sub="realized on followers"
          icon={<Lightning size={16} weight="duotone" />}
        />
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
      {recentEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-fg">Replication activity</h2>
          <Card className="divide-y divide-line overflow-hidden p-0">
            {recentEvents.map((e) => (
              <ActivityRow key={e.id} event={e} />
            ))}
          </Card>
        </div>
      )}

      {dialog && (
        <LinkDialog
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

/* ---------------------------------------------------------------- Stats */

function Stat({
  label,
  value,
  valueNode,
  sub,
  icon,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
        <span className="text-fg-faint">{icon}</span>
      </div>
      <div className="mt-2">
        {valueNode ?? <span className="tnum text-lg font-semibold text-fg">{value}</span>}
      </div>
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
  const active = link.status === "ACTIVE";
  const followerNeedsBot = !link.follower.hasBot;
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
        {link.maxRiskPct !== null && <Badge tone="neutral" mono>Max {link.maxRiskPct}%</Badge>}
        {!link.copyClose && <Badge tone="neutral">Entries only</Badge>}
      </div>

      {followerNeedsBot && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-warning-soft px-2.5 py-1.5 text-[11px] font-medium text-warning">
          <Info size={13} weight="fill" /> Follower has no bot yet, so copies are skipped until you connect one.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <p className="tnum text-[11px] text-fg-subtle">
          {link.copiedCount} copied{link.lastCopiedAt ? ` · last ${new Date(link.lastCopiedAt).toLocaleDateString()}` : ""}
        </p>
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

function ActivityRow({ event }: { event: CopyTradingData["recentEvents"][number] }) {
  const statusMeta =
    event.status === "FILLED"
      ? { icon: <CheckCircle size={16} weight="fill" className="text-profit" />, label: "Filled" }
      : event.status === "SKIPPED"
        ? { icon: <MinusCircle size={16} weight="fill" className="text-fg-subtle" />, label: "Skipped" }
        : { icon: <XCircle size={16} weight="fill" className="text-negative" />, label: "Failed" };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface/40">
      <span className="shrink-0">{statusMeta.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-fg">
          <span className="font-medium">{event.action === "OPEN" ? "Opened" : "Closed"}</span>{" "}
          {event.direction} {event.instrument}
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
        <p className="text-[10px] text-fg-faint">{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Link dialog */

function LinkDialog({
  mode,
  link,
  accounts,
  links,
  onClose,
  onSaved,
}: {
  mode: "new" | "edit";
  link: CopyLinkRow | null;
  accounts: CopyAccountLite[];
  links: CopyLinkRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const usedAsFollower = useMemo(() => new Set(links.map((l) => l.follower.id)), [links]);
  const usedAsMaster = useMemo(() => new Set(links.map((l) => l.master.id)), [links]);

  const [masterId, setMasterId] = useState(link?.master.id ?? "");
  const [followerId, setFollowerId] = useState(link?.follower.id ?? "");
  const [sizingMode, setSizingMode] = useState<CopySizingMode>(link?.sizingMode ?? "PROPORTIONAL");
  const [multiplier, setMultiplier] = useState(String(link?.multiplier ?? 1));
  const [fixedUnits, setFixedUnits] = useState(link?.fixedUnits != null ? String(link.fixedUnits) : "");
  const [maxRiskPct, setMaxRiskPct] = useState(link?.maxRiskPct != null ? String(link.maxRiskPct) : "");
  const [reverse, setReverse] = useState(link?.reverse ?? false);
  const [copyOpen, setCopyOpen] = useState(link?.copyOpen ?? true);
  const [copyClose, setCopyClose] = useState(link?.copyClose ?? true);

  const masterOptions = useMemo(
    () => accounts.filter((a) => !usedAsFollower.has(a.id)),
    [accounts, usedAsFollower],
  );
  const followerOptions = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.id !== masterId &&
          !usedAsMaster.has(a.id) &&
          !links.some((l) => l.master.id === masterId && l.follower.id === a.id),
      ),
    [accounts, masterId, usedAsMaster, links],
  );

  const master = accounts.find((a) => a.id === masterId);
  const follower = accounts.find((a) => a.id === followerId);

  function submit() {
    setError(null);
    const mult = Number(multiplier);
    const fixed = fixedUnits === "" ? null : Number(fixedUnits);
    const maxRisk = maxRiskPct === "" ? null : Number(maxRiskPct);

    startTransition(async () => {
      const settings = { sizingMode, multiplier: mult, fixedUnits: fixed, maxRiskPct: maxRisk, reverse, copyOpen, copyClose };
      const res =
        mode === "new"
          ? await createCopyLink({ masterAccountId: masterId, followerAccountId: followerId, ...settings })
          : await updateCopyLink(link!.id, settings);
      if (res.ok) {
        toast.success(mode === "new" ? "Copy link created." : "Copy link updated.");
        if (res.warning) toast.warning(res.warning);
        onSaved();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  const needAccounts = mode === "new" && (masterOptions.length === 0 || accounts.length < 2);

  return (
    <Dialog isOpen onClose={onClose} title={mode === "new" ? "New copy link" : "Edit copy link"}>
      <div className="space-y-4">
        {needAccounts ? (
          <p className="rounded-[var(--radius-control)] bg-surface px-3 py-3 text-sm text-fg-subtle">
            You need at least two eligible accounts to create a link. An account that already leads or follows cannot be
            reused on the other side.
          </p>
        ) : mode === "new" ? (
          <div className="grid grid-cols-1 gap-3">
            <SelectField
              id="master"
              label="Master account (leads)"
              value={masterId}
              onChange={(v) => {
                setMasterId(v);
                if (v === followerId) setFollowerId("");
              }}
              placeholder="Choose the account to copy from"
              options={masterOptions}
            />
            <SelectField
              id="follower"
              label="Follower account (mirrors)"
              value={followerId}
              onChange={setFollowerId}
              placeholder={masterId ? "Choose an account to copy into" : "Pick a master first"}
              options={followerOptions}
              disabled={!masterId}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[var(--radius-control)] bg-surface px-3 py-2.5">
            <AccountChip account={link!.master} role="master" />
            <ArrowRight size={14} weight="bold" className="text-fg-subtle" />
            <AccountChip account={link!.follower} role="follower" />
          </div>
        )}

        {!needAccounts && (
          <>
            {/* Sizing mode */}
            <div className="space-y-1.5">
              <Label>Sizing rule</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {SIZING_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setSizingMode(m.value)}
                    aria-pressed={sizingMode === m.value}
                    className={cn(
                      "flex items-start gap-2.5 rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      sizingMode === m.value ? "border-accent bg-accent-soft/40" : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        sizingMode === m.value ? "border-accent" : "border-line-strong",
                      )}
                    >
                      {sizingMode === m.value && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-fg">{m.label}</span>
                      <span className="block text-[11px] leading-snug text-fg-subtle">{m.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-specific inputs */}
            {(sizingMode === "MULTIPLIER" || sizingMode === "PROPORTIONAL") && (
              <Field id="multiplier" label="Multiplier" hint="Scales the copied size. 1 keeps it as-is, 0.5 halves, 2 doubles.">
                <Input
                  id="multiplier"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  trailing="x"
                />
              </Field>
            )}
            {sizingMode === "FIXED" && (
              <Field id="fixed" label="Fixed size" hint="Every copied trade uses this many units.">
                <Input id="fixed" type="number" step="0.01" min="0.01" value={fixedUnits} onChange={(e) => setFixedUnits(e.target.value)} trailing="units" />
              </Field>
            )}

            <Field id="maxrisk" label="Max risk per trade (optional)" hint="Caps the risk percent carried onto each copy. Leave blank to inherit the master's risk.">
              <Input id="maxrisk" type="number" step="0.1" min="0.1" max="100" value={maxRiskPct} onChange={(e) => setMaxRiskPct(e.target.value)} trailing="%" placeholder="Inherit" />
            </Field>

            {/* Toggles */}
            <div className="space-y-2.5 rounded-[var(--radius-control)] border border-line bg-surface/50 px-3 py-3">
              <ToggleRow
                label="Reverse direction"
                description="Copy the opposite side. The master going long opens a short on the follower."
                checked={reverse}
                onChange={setReverse}
              />
              <ToggleRow label="Mirror entries" description="Open a copy when the master opens a trade." checked={copyOpen} onChange={setCopyOpen} />
              <ToggleRow label="Mirror exits" description="Close the copy when the master closes its trade." checked={copyClose} onChange={setCopyClose} />
            </div>

            {/* Live preview */}
            <SizePreview sizingMode={sizingMode} multiplier={Number(multiplier)} fixedUnits={fixedUnits === "" ? null : Number(fixedUnits)} reverse={reverse} master={master ?? link?.master ?? null} follower={follower ?? link?.follower ?? null} />

            {error && (
              <p className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-xs text-negative" role="alert">
                {error}
              </p>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {!needAccounts && (
            <Button
              size="sm"
              onClick={submit}
              disabled={pending || (mode === "new" && (!masterId || !followerId))}
            >
              {pending ? "Saving" : mode === "new" ? "Create link" : "Save changes"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: CopyAccountLite[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg shadow-[var(--shadow-sm)] transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-ring)] disabled:pointer-events-none disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nickname} · {a.broker} {a.mode === "LIVE" ? "(Live)" : "(Paper)"} {shortAccountId(a.id)}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-fg">{label}</p>
        <p className="text-[11px] leading-snug text-fg-subtle">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function SizePreview({
  sizingMode,
  multiplier,
  fixedUnits,
  reverse,
  master,
  follower,
}: {
  sizingMode: CopySizingMode;
  multiplier: number;
  fixedUnits: number | null;
  reverse: boolean;
  master: CopyAccountLite | null;
  follower: CopyAccountLite | null;
}) {
  let line: string;
  switch (sizingMode) {
    case "MIRROR":
      line = "Each copy uses the exact same size as the master order.";
      break;
    case "MULTIPLIER":
      line = `Each copy uses ${Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1}x the master size.`;
      break;
    case "PROPORTIONAL": {
      if (master && follower && master.balance > 0) {
        const ratio = (follower.balance / master.balance) * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
        line = `At current balances, each copy is about ${(ratio * 100).toFixed(0)}% of the master size (follower equity vs master, times the multiplier).`;
      } else {
        line = "Each copy scales by the follower's equity relative to the master, times the multiplier.";
      }
      break;
    }
    case "FIXED":
      line = `Each copy uses a fixed ${fixedUnits ?? 0} units, regardless of the master size.`;
      break;
    default:
      line = "";
  }

  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-control)] bg-accent-soft/30 px-3 py-2.5">
      <Info size={14} weight="fill" className="mt-0.5 shrink-0 text-accent" />
      <p className="text-[11px] leading-relaxed text-fg-muted">
        {line}
        {reverse ? " Direction is reversed: the follower trades the opposite side." : ""}
      </p>
    </div>
  );
}
