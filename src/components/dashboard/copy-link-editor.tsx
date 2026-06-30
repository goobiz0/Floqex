"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  X,
  ArrowRight,
  ArrowsClockwise,
  Lightning,
  Copy,
  Info,
  CircleNotch,
  TrendUp,
  TrendDown,
  Funnel,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  SIZING_MODES,
  resolveCopyOrder,
  parseSymbolFilter,
  shortAccountId,
  type CopySizingMode,
  type CopyFilterMode,
  type CopyRule,
} from "@/lib/copy-trading";
import type { CopyLinkRow, CopyAccountLite } from "@/lib/queries";
import { createCopyLink, updateCopyLink } from "@/app/dashboard/copy-trading/actions";

export function CopyLinkEditor({
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
  const [minUnits, setMinUnits] = useState(link?.minUnits != null ? String(link.minUnits) : "");
  const [maxUnits, setMaxUnits] = useState(link?.maxUnits != null ? String(link.maxUnits) : "");
  const [maxDailyLossPct, setMaxDailyLossPct] = useState(link?.maxDailyLossPct != null ? String(link.maxDailyLossPct) : "");
  const [symbolFilter, setSymbolFilter] = useState(link?.symbolFilter ?? "");
  const [symbolFilterMode, setSymbolFilterMode] = useState<CopyFilterMode>(link?.symbolFilterMode ?? "ALLOW");
  const [reverse, setReverse] = useState(link?.reverse ?? false);
  const [copyOpen, setCopyOpen] = useState(link?.copyOpen ?? true);
  const [copyClose, setCopyClose] = useState(link?.copyClose ?? true);

  // Sizing-preview example (uses the accounts' real balances).
  const [exampleUnits, setExampleUnits] = useState("10");
  const [exampleStopPct, setExampleStopPct] = useState("1");

  // Escape to close + lock body scroll, matching the shared Dialog behavior.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const masterOptions = useMemo(() => accounts.filter((a) => !usedAsFollower.has(a.id)), [accounts, usedAsFollower]);
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

  const master = accounts.find((a) => a.id === masterId) ?? link?.master ?? null;
  const follower = accounts.find((a) => a.id === followerId) ?? link?.follower ?? null;

  const rule: CopyRule = useMemo(
    () => ({
      sizingMode,
      multiplier: Number(multiplier) || 0,
      fixedUnits: fixedUnits === "" ? null : Number(fixedUnits),
      maxRiskPct: maxRiskPct === "" ? null : Number(maxRiskPct),
      minUnits: minUnits === "" ? null : Number(minUnits),
      maxUnits: maxUnits === "" ? null : Number(maxUnits),
      reverse,
      symbolFilter: symbolFilter.trim() === "" ? null : symbolFilter,
      symbolFilterMode,
    }),
    [sizingMode, multiplier, fixedUnits, maxRiskPct, minUnits, maxUnits, reverse, symbolFilter, symbolFilterMode],
  );

  // Live simulation: what the engine would place for an example master order,
  // computed with the exact resolver the engine uses. Real account balances.
  const sim = useMemo(() => {
    if (!master || !follower) return null;
    const entry = 100;
    const sd = (entry * (Number(exampleStopPct) || 1)) / 100;
    const tokens = parseSymbolFilter(symbolFilter);
    const sampleInstrument = symbolFilterMode === "ALLOW" && tokens.length > 0 ? tokens[0] : "BTC/USD";
    const mUnits = Number(exampleUnits) || 0;
    const masterRiskPct = master.balance > 0 ? (mUnits * sd) / master.balance : 0;
    return {
      masterRiskPct,
      resolved: resolveCopyOrder({
        direction: "LONG",
        masterUnits: mUnits,
        masterBalance: master.balance,
        followerBalance: follower.balance,
        instrument: sampleInstrument,
        entryPrice: entry,
        stopPrice: entry - sd,
        targetPrice: entry + sd * 2,
        masterRiskPct,
        rule,
      }),
    };
  }, [master, follower, exampleStopPct, exampleUnits, symbolFilter, symbolFilterMode, rule]);

  function submit() {
    setError(null);
    const settings = {
      sizingMode,
      multiplier: Number(multiplier),
      fixedUnits: fixedUnits === "" ? null : Number(fixedUnits),
      maxRiskPct: maxRiskPct === "" ? null : Number(maxRiskPct),
      minUnits: minUnits === "" ? null : Number(minUnits),
      maxUnits: maxUnits === "" ? null : Number(maxUnits),
      maxDailyLossPct: maxDailyLossPct === "" ? null : Number(maxDailyLossPct),
      symbolFilter: symbolFilter.trim() === "" ? null : symbolFilter,
      symbolFilterMode,
      reverse,
      copyOpen,
      copyClose,
    };
    startTransition(async () => {
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
  const canSave = !needAccounts && (mode === "edit" || (Boolean(masterId) && Boolean(followerId)));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-base/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label={mode === "new" ? "New copy link" : "Edit copy link"}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-fg">{mode === "new" ? "New copy link" : "Edit copy link"}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-[var(--radius-control)] p-1 text-fg-subtle transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          {/* Body */}
          <div className="grid flex-1 grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_300px]">
            <div className="space-y-5 p-5">
              {needAccounts ? (
                <p className="rounded-[var(--radius-control)] bg-surface px-3 py-3 text-sm text-fg-subtle">
                  You need at least two eligible accounts to create a link. An account that already leads or follows
                  cannot be reused on the other side.
                </p>
              ) : (
                <>
                  {/* Accounts */}
                  <Section title="Accounts" icon={<Copy size={14} weight="duotone" />}>
                    {mode === "new" ? (
                      <div className="grid grid-cols-1 gap-3">
                        <SelectField
                          id="master"
                          label="Master account (leads)"
                          value={masterId}
                          onChange={(v) => {
                            setMasterId(v);
                            setFollowerId("");
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
                      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] bg-surface px-3 py-2.5">
                        <AccountChip account={link!.master} role="master" />
                        <ArrowRight size={14} weight="bold" className="text-fg-subtle" />
                        <AccountChip account={link!.follower} role="follower" />
                      </div>
                    )}
                  </Section>

                  {/* Sizing */}
                  <Section title="Sizing rule" icon={<TrendUp size={14} weight="duotone" />}>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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

                    {(sizingMode === "MULTIPLIER" || sizingMode === "PROPORTIONAL") && (
                      <Field id="multiplier" label="Multiplier" hint="Scales the copied size. 1 keeps it as-is, 0.5 halves, 2 doubles.">
                        <Input id="multiplier" type="number" step="0.1" min="0.1" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} trailing="x" />
                      </Field>
                    )}
                    {sizingMode === "FIXED" && (
                      <Field id="fixed" label="Fixed size" hint="Every copied trade uses this many units.">
                        <Input id="fixed" type="number" step="0.01" min="0.01" value={fixedUnits} onChange={(e) => setFixedUnits(e.target.value)} trailing="units" />
                      </Field>
                    )}
                  </Section>

                  {/* Risk and size limits */}
                  <Section title="Risk and limits" icon={<ShieldCheck size={14} weight="duotone" />}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field id="maxrisk" label="Max risk per trade" hint="Caps each copy to this share of follower equity.">
                        <Input id="maxrisk" type="number" step="0.1" min="0.1" max="100" value={maxRiskPct} onChange={(e) => setMaxRiskPct(e.target.value)} trailing="%" placeholder="Off" />
                      </Field>
                      <Field id="dailyloss" label="Daily loss limit" hint="Auto-pause the link past this daily copied loss.">
                        <Input id="dailyloss" type="number" step="0.1" min="0.1" max="100" value={maxDailyLossPct} onChange={(e) => setMaxDailyLossPct(e.target.value)} trailing="%" placeholder="Off" />
                      </Field>
                      <Field id="minunits" label="Minimum size" hint="Floor tiny copies up to this size.">
                        <Input id="minunits" type="number" step="0.01" min="0.01" value={minUnits} onChange={(e) => setMinUnits(e.target.value)} trailing="units" placeholder="Off" />
                      </Field>
                      <Field id="maxunits" label="Maximum size" hint="Hard ceiling on any single copy.">
                        <Input id="maxunits" type="number" step="0.01" min="0.01" value={maxUnits} onChange={(e) => setMaxUnits(e.target.value)} trailing="units" placeholder="Off" />
                      </Field>
                    </div>
                  </Section>

                  {/* Instrument filter */}
                  <Section title="Instrument filter" icon={<Funnel size={14} weight="duotone" />}>
                    <div className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-surface p-1">
                      {(["ALLOW", "DENY"] as CopyFilterMode[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          role="tab"
                          aria-selected={symbolFilterMode === opt}
                          onClick={() => setSymbolFilterMode(opt)}
                          className={cn(
                            "flex-1 rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium transition-colors",
                            symbolFilterMode === opt ? "bg-elevated text-fg shadow-[var(--shadow-sm)]" : "text-fg-subtle hover:text-fg",
                          )}
                        >
                          {opt === "ALLOW" ? "Copy only these" : "Copy all but these"}
                        </button>
                      ))}
                    </div>
                    <Field id="symbols" label="Instruments" hint="Comma-separated, e.g. BTC, ETH, EUR/USD. Leave blank to copy every instrument.">
                      <Input id="symbols" value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)} placeholder="All instruments" />
                    </Field>
                  </Section>

                  {/* Behavior */}
                  <Section title="Behavior" icon={<ArrowsClockwise size={14} weight="duotone" />}>
                    <div className="space-y-2.5 rounded-[var(--radius-control)] border border-line bg-surface/50 px-3 py-3">
                      <ToggleRow label="Reverse direction" description="Copy the opposite side. The master going long opens a short on the follower." checked={reverse} onChange={setReverse} />
                      <ToggleRow label="Mirror entries" description="Open a copy when the master opens a trade." checked={copyOpen} onChange={setCopyOpen} />
                      <ToggleRow label="Mirror exits" description="Close the copy when the master closes its trade." checked={copyClose} onChange={setCopyClose} />
                    </div>
                  </Section>
                </>
              )}
            </div>

            {/* Live preview rail */}
            {!needAccounts && (
              <div className="border-t border-line bg-surface/30 p-5 lg:border-l lg:border-t-0">
                <div className="lg:sticky lg:top-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    <Lightning size={12} weight="fill" className="text-accent" /> Sizing preview
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-fg-faint">
                    An example order, sized with your real account balances using the live engine rules.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Field id="ex-units" label="Master order">
                      <Input id="ex-units" type="number" step="1" min="0" value={exampleUnits} onChange={(e) => setExampleUnits(e.target.value)} trailing="u" />
                    </Field>
                    <Field id="ex-stop" label="Stop">
                      <Input id="ex-stop" type="number" step="0.1" min="0.1" value={exampleStopPct} onChange={(e) => setExampleStopPct(e.target.value)} trailing="%" />
                    </Field>
                  </div>

                  {sim ? (
                    <div className="mt-3 space-y-2.5 rounded-[var(--radius-card)] border border-line bg-elevated p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-fg-subtle">Follower side</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold",
                            sim.resolved.direction === "LONG" ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
                          )}
                        >
                          {sim.resolved.direction === "LONG" ? <TrendUp size={11} weight="bold" /> : <TrendDown size={11} weight="bold" />}
                          {sim.resolved.direction}
                        </span>
                      </div>

                      {sim.resolved.skip ? (
                        <div className="flex items-start gap-1.5 rounded-[var(--radius-control)] bg-warning-soft px-2.5 py-2 text-[11px] leading-snug text-warning">
                          <Info size={13} weight="fill" className="mt-px shrink-0" />
                          <span>{sim.resolved.skip.reason}</span>
                        </div>
                      ) : (
                        <>
                          <PreviewStat label="Copied size" value={`${sim.resolved.units.toLocaleString("en-US", { maximumFractionDigits: 4 })} units`} />
                          <PreviewStat label="Follower risk" value={`${(sim.resolved.riskPct * 100).toFixed(2)}%`} />
                          <div className="border-t border-line pt-2">
                            <p className="text-[10px] leading-snug text-fg-faint">
                              Master risks about {(sim.masterRiskPct * 100).toFixed(2)}% on this example.
                              {reverse ? " Direction is reversed on the follower." : ""}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-line bg-elevated p-4 text-center text-[11px] text-fg-subtle">
                      Choose a master and follower to preview sizing.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-3 border-t border-line px-5 py-4">
            {error && (
              <p className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-xs text-negative" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              {!needAccounts && (
                <Button size="sm" onClick={submit} disabled={pending || !canSave} className="min-w-28">
                  {pending ? (
                    <>
                      <CircleNotch size={14} weight="bold" className="animate-spin" /> Saving
                    </>
                  ) : mode === "new" ? (
                    "Create link"
                  ) : (
                    "Save changes"
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- helpers */

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        <span className="text-accent">{icon}</span>
        {title}
      </p>
      {children}
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-fg-subtle">{label}</span>
      <span className="tnum text-[13px] font-semibold text-fg">{value}</span>
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
