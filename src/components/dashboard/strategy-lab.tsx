"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PARAM_BOUNDS,
  PARAM_LABELS,
  formatParamValue,
  displayParamValue,
  type Bound,
  type StrategyParams,
} from "@/lib/strategy-schema";
import type { AdjustmentRow } from "@/lib/queries";
import {
  saveStrategy,
  approveSuggestion,
  rejectSuggestion,
} from "@/app/dashboard/strategy/actions";

const AUTO_LIMIT = 15;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

type LogEntry = {
  id: string;
  param: string;
  old: string;
  next: string;
  source: "BOT" | "USER";
  reason?: string | null;
  time: string;
};

const toLogEntry = (a: AdjustmentRow): LogEntry => ({
  id: a.id,
  param: a.parameter,
  old: displayParamValue(a.paramKey, a.oldValue),
  next: displayParamValue(a.paramKey, a.newValue),
  source: a.source,
  reason: a.reasoning,
  time: fmtDate(a.createdAt),
});

export function StrategyLab({
  initialParams,
  changeLog,
  pending,
  autoAdjustmentsUsed,
}: {
  initialParams: StrategyParams;
  changeLog: AdjustmentRow[];
  pending: AdjustmentRow[];
  autoAdjustmentsUsed: number;
}) {
  const [params, setParams] = useState<StrategyParams>(initialParams);
  const [saved, setSaved] = useState<StrategyParams>(initialParams);
  const [confirming, setConfirming] = useState(false);
  const [log, setLog] = useState<LogEntry[]>(() => changeLog.map(toLogEntry));
  const [suggestions, setSuggestions] = useState<AdjustmentRow[]>(pending);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirtyKeys = useMemo(
    () => (Object.keys(params) as (keyof StrategyParams)[]).filter((k) => params[k] !== saved[k]),
    [params, saved],
  );

  function set<K extends keyof StrategyParams>(key: K, value: StrategyParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function commit() {
    const snapshot = params;
    const prev = saved;
    setError(null);
    startTransition(async () => {
      const res = await saveStrategy(snapshot);
      if (!res.ok) {
        setError(res.error ?? "Could not save changes.");
        return;
      }
      const now = new Date().toISOString();
      const entries: LogEntry[] = (Object.keys(PARAM_LABELS) as (keyof StrategyParams)[])
        .filter((k) => prev[k] !== snapshot[k])
        .map((k) => ({
          id: `local-${k}-${now}`,
          param: PARAM_LABELS[k],
          old: formatParamValue(k, prev[k]),
          next: formatParamValue(k, snapshot[k]),
          source: "USER" as const,
          time: fmtDate(now),
        }));
      setLog((l) => [...entries, ...l]);
      setSaved(snapshot);
      setConfirming(false);
    });
  }

  function decide(id: string, approve: boolean) {
    setError(null);
    startTransition(async () => {
      const res = approve ? await approveSuggestion(id) : await rejectSuggestion(id);
      if (!res.ok) {
        setError(res.error ?? "Could not update the suggestion.");
        return;
      }
      setSuggestions((s) => s.filter((x) => x.id !== id));
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      {/* Editor */}
      <div className="space-y-4">
        <Group title="Entry & exit">
          <NumberField bound={PARAM_BOUNDS.rangeMinutes} value={params.rangeMinutes} onChange={(v) => set("rangeMinutes", v)} />
          <NumberField bound={PARAM_BOUNDS.rrTarget} value={params.rrTarget} onChange={(v) => set("rrTarget", v)} />
        </Group>

        <Group title="Range filters">
          <NumberField bound={PARAM_BOUNDS.minRange} value={params.minRange} onChange={(v) => set("minRange", v)} />
          <NumberField bound={PARAM_BOUNDS.maxRange} value={params.maxRange} onChange={(v) => set("maxRange", v)} />
        </Group>

        <Group title="Risk controls">
          <NumberField bound={PARAM_BOUNDS.riskPct} value={params.riskPct} onChange={(v) => set("riskPct", v)} />
          <NumberField bound={PARAM_BOUNDS.dailyLoss} value={params.dailyLoss} onChange={(v) => set("dailyLoss", v)} />
          <NumberField bound={PARAM_BOUNDS.maxTrades} value={params.maxTrades} onChange={(v) => set("maxTrades", v)} />
        </Group>

        <Group title="Filters">
          <ToggleField label={PARAM_LABELS.trendFilter} value={params.trendFilter} onChange={(v) => set("trendFilter", v)} help="Log whether each trade agreed with the 20-period trend." />
          <ToggleField label={PARAM_LABELS.reEntry} value={params.reEntry} onChange={(v) => set("reEntry", v)} help="Wait for a pullback inside the range before re-entering." />
        </Group>
      </div>

      {/* Side: change log + learning */}
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <CardTitle>Change log</CardTitle>
            {dirtyKeys.length > 0 && (
              <Badge tone="warning" mono>
                {dirtyKeys.length} unsaved
              </Badge>
            )}
          </div>
          {log.length ? (
            <ul className="mt-4 space-y-4">
              {log.map((e) => (
                <li key={e.id} className="relative pl-4">
                  <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-fg">{e.param}</span>
                    <Badge tone={e.source === "BOT" ? "accent" : "neutral"}>
                      {e.source === "BOT" ? "Bot" : "You"}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs">
                    <span className="text-negative line-through">{e.old}</span>
                    <span className="text-fg-subtle"> → </span>
                    <span className="text-positive">{e.next}</span>
                  </p>
                  {e.reason && <p className="mt-1 text-xs text-fg-subtle">{e.reason}</p>}
                  <p className="mt-0.5 text-[0.7rem] text-fg-faint">{e.time}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-fg-subtle">
              No changes yet. Saved edits and the bot&apos;s auto-adjustments appear here.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <CardTitle>Bot learning</CardTitle>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">Auto-adjustments used</span>
              <span className="tnum text-fg">
                {autoAdjustmentsUsed} / {AUTO_LIMIT}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, (autoAdjustmentsUsed / AUTO_LIMIT) * 100)}%` }}
              />
            </div>
          </div>

          {suggestions.length ? (
            <div className="mt-5 space-y-3">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-[var(--radius-control)] border border-line bg-base/50 p-4"
                >
                  <p className="text-sm font-medium text-fg">Pending suggestion</p>
                  <p className="mt-1 font-mono text-xs">
                    {s.parameter}{" "}
                    <span className="text-negative line-through">
                      {displayParamValue(s.paramKey, s.oldValue)}
                    </span>
                    <span className="text-fg-subtle"> → </span>
                    <span className="text-positive">
                      {displayParamValue(s.paramKey, s.newValue)}
                    </span>
                  </p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Sample", s.sampleSize != null ? String(s.sampleSize) : "—"],
                      ["Win delta", s.winRateDelta != null ? `${s.winRateDelta}` : "—"],
                      ["Confidence", s.confidence != null ? `${s.confidence}` : "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-[6px] bg-surface py-1.5">
                        <dt className="text-[0.65rem] text-fg-subtle">{k}</dt>
                        <dd className="tnum text-xs font-medium text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" disabled={isPending} onClick={() => decide(s.id, true)}>
                      <Check size={15} weight="bold" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      disabled={isPending}
                      onClick={() => decide(s.id, false)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-fg-subtle">
              No pending suggestions. The bot files evidence-backed proposals here once auto-adjust
              headroom is used up.
            </p>
          )}
        </Card>
      </div>

      {/* Save bar */}
      <AnimatePresence>
        {dirtyKeys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[min(92%,440px)] items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-overlay/95 px-4 py-3 backdrop-blur lg:bottom-6 lg:left-60"
          >
            <span className="text-sm text-fg-muted">
              {dirtyKeys.length} unsaved change{dirtyKeys.length > 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setParams(saved)} disabled={isPending}>
                Discard
              </Button>
              <Button size="sm" onClick={() => setConfirming(true)} disabled={isPending}>
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirming && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={() => setConfirming(false)} />
            <motion.div
              role="dialog"
              aria-modal
              className="fixed left-1/2 top-1/2 z-50 w-[min(92%,400px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-line bg-elevated p-6"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-fg">Save changes?</h2>
                <button onClick={() => setConfirming(false)} className="text-fg-subtle hover:text-fg" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <p className="mt-2 text-sm text-fg-muted">
                {dirtyKeys.length} parameter{dirtyKeys.length > 1 ? "s" : ""} will change and be recorded in the change log.
              </p>
              {error && <p className="mt-3 text-sm text-negative">{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={commit} disabled={isPending}>
                  {isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <CardTitle>{title}</CardTitle>
      <div className="mt-4 space-y-5">{children}</div>
    </Card>
  );
}

function NumberField({
  bound,
  value,
  onChange,
}: {
  bound: Bound;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {bound.label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          value={value}
          min={bound.min}
          max={bound.max}
          step={bound.step}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Math.min(bound.max, Math.max(bound.min, Number.isNaN(v) ? bound.min : v)));
          }}
          className="tnum w-28 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg focus-visible:border-accent focus-visible:outline-none"
        />
        {bound.suffix && <span className="text-sm text-fg-subtle">{bound.suffix}</span>}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{bound.help}</p>
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {help && <p className="mt-1 text-xs leading-relaxed text-fg-subtle">{help}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={cn(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-150 ease-[var(--ease-out)]",
          value ? "bg-accent" : "bg-surface",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-fg transition-transform duration-150 ease-[var(--ease-out)]",
            value ? "left-0.5 translate-x-4" : "left-0.5 translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
