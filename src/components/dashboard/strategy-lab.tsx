"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Params = {
  rangeMinutes: number;
  rrTarget: number;
  minRange: number;
  maxRange: number;
  riskPct: number;
  dailyLoss: number;
  maxTrades: number;
  trendFilter: boolean;
  reEntry: boolean;
};

const INITIAL: Params = {
  rangeMinutes: 15,
  rrTarget: 2,
  minRange: 0.3,
  maxRange: 3,
  riskPct: 1,
  dailyLoss: 3,
  maxTrades: 8,
  trendFilter: true,
  reEntry: true,
};

const LABELS: Record<keyof Params, string> = {
  rangeMinutes: "Opening range window",
  rrTarget: "Reward to risk target",
  minRange: "Min range filter",
  maxRange: "Max range filter",
  riskPct: "Risk per trade",
  dailyLoss: "Daily loss limit",
  maxTrades: "Max trades per day",
  trendFilter: "Trend filter",
  reEntry: "Re-entry rule",
};

type LogEntry = {
  time: string;
  param: string;
  old: string;
  next: string;
  source: "BOT" | "USER";
  reason?: string;
};

const SEED_LOG: LogEntry[] = [
  { time: "2 days ago", param: "Max range filter", old: "3.2x", next: "3.0x", source: "BOT", reason: "Large ranges underperforming (n=22)" },
  { time: "5 days ago", param: "Entry cutoff", old: "15:00", next: "14:30", source: "BOT", reason: "Late entries fell short of target (n=20)" },
  { time: "1 week ago", param: "Risk per trade", old: "1.5%", next: "1.0%", source: "USER" },
];

export function StrategyLab() {
  const [params, setParams] = useState<Params>(INITIAL);
  const [saved, setSaved] = useState<Params>(INITIAL);
  const [confirming, setConfirming] = useState(false);
  const [log, setLog] = useState<LogEntry[]>(SEED_LOG);
  const [suggestion, setSuggestion] = useState<"open" | "approved" | "rejected">("open");

  const dirtyKeys = useMemo(
    () =>
      (Object.keys(params) as (keyof Params)[]).filter(
        (k) => params[k] !== saved[k],
      ),
    [params, saved],
  );

  function set<K extends keyof Params>(key: K, value: Params[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function commit() {
    const now = new Date();
    const entries: LogEntry[] = dirtyKeys.map((k) => ({
      time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      param: LABELS[k],
      old: String(saved[k]),
      next: String(params[k]),
      source: "USER",
    }));
    setLog((l) => [...entries, ...l]);
    setSaved(params);
    setConfirming(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      {/* Editor */}
      <div className="space-y-4">
        <Group title="Entry & exit">
          <NumberField label={LABELS.rangeMinutes} suffix="min" value={params.rangeMinutes} min={5} max={60} step={1} onChange={(v) => set("rangeMinutes", v)} help="Length of the opening range captured at session start." />
          <NumberField label={LABELS.rrTarget} suffix="R" value={params.rrTarget} min={1} max={5} step={0.1} onChange={(v) => set("rrTarget", v)} help="Profit target as a multiple of the risk." />
        </Group>

        <Group title="Range filters">
          <NumberField label={LABELS.minRange} suffix="x" value={params.minRange} min={0.1} max={1} step={0.05} onChange={(v) => set("minRange", v)} help="Skip sessions where the range is smaller than this multiple of a normal day." />
          <NumberField label={LABELS.maxRange} suffix="x" value={params.maxRange} min={1.5} max={5} step={0.1} onChange={(v) => set("maxRange", v)} help="Skip sessions where the range is larger than this (usually news driven)." />
        </Group>

        <Group title="Risk controls">
          <NumberField label={LABELS.riskPct} suffix="%" value={params.riskPct} min={0.1} max={2} step={0.1} onChange={(v) => set("riskPct", v)} help="Hard ceiling 2%. Position size is derived from the stop distance." />
          <NumberField label={LABELS.dailyLoss} suffix="%" value={params.dailyLoss} min={1} max={5} step={0.5} onChange={(v) => set("dailyLoss", v)} help="Trading halts for the day once this is hit. Hard ceiling 5%." />
          <NumberField label={LABELS.maxTrades} value={params.maxTrades} min={1} max={20} step={1} onChange={(v) => set("maxTrades", v)} help="Across both sessions. Caps overtrading." />
        </Group>

        <Group title="Filters">
          <ToggleField label={LABELS.trendFilter} value={params.trendFilter} onChange={(v) => set("trendFilter", v)} help="Log whether each trade agreed with the 20-period trend." />
          <ToggleField label={LABELS.reEntry} value={params.reEntry} onChange={(v) => set("reEntry", v)} help="Wait for a pullback inside the range before re-entering." />
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
          <ul className="mt-4 space-y-4">
            {log.map((e, i) => (
              <li key={i} className="relative pl-4">
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
                {e.reason && (
                  <p className="mt-1 text-xs text-fg-subtle">{e.reason}</p>
                )}
                <p className="mt-0.5 text-[0.7rem] text-fg-faint">{e.time}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <CardTitle>Bot learning</CardTitle>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">Auto-adjustments used</span>
              <span className="tnum text-fg">12 / 15</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface">
              <div className="h-full rounded-full bg-accent" style={{ width: "80%" }} />
            </div>
          </div>

          <AnimatePresence>
            {suggestion === "open" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="mt-5 rounded-[var(--radius-control)] border border-line bg-base/50 p-4"
              >
                <p className="text-sm font-medium text-fg">Pending suggestion</p>
                <p className="mt-1 font-mono text-xs">
                  Min range filter{" "}
                  <span className="text-negative line-through">0.30x</span>
                  <span className="text-fg-subtle"> → </span>
                  <span className="text-positive">0.40x</span>
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Sample", "24"],
                    ["Win delta", "+9%"],
                    ["Confidence", "94%"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-[6px] bg-surface py-1.5">
                      <dt className="text-[0.65rem] text-fg-subtle">{k}</dt>
                      <dd className="tnum text-xs font-medium text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => setSuggestion("approved")}>
                    <Check size={15} weight="bold" />
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => setSuggestion("rejected")}>
                    Reject
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {suggestion !== "open" && (
            <p className="mt-5 text-sm text-fg-subtle">
              Suggestion {suggestion}. The bot will not re-raise it without new evidence.
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
              <Button size="sm" variant="ghost" onClick={() => setParams(saved)}>
                Discard
              </Button>
              <Button size="sm" onClick={() => setConfirming(true)}>
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
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={commit}>
                  Save changes
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
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  help?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-fg">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Math.min(max, Math.max(min, isNaN(v) ? min : v)));
          }}
          className="tnum w-28 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg focus-visible:border-accent focus-visible:outline-none"
        />
        {suffix && <span className="text-sm text-fg-subtle">{suffix}</span>}
      </div>
      {help && <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{help}</p>}
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
