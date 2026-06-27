"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Warning, Power, Pulse, X, GridFour, Stack as StackIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClampedNumberInput } from "@/components/ui/clamped-number-input";
import { InfoTip } from "@/components/ui/info-tip";
import { cn, formatUSD } from "@/lib/utils";
import { haltAllBots, resumeTrading, setRiskPolicy } from "@/app/dashboard/risk/actions";
import type { PortfolioState, ConcentrationSlice } from "@/lib/engine/portfolio-risk";

export function PortfolioRiskView({ state }: { state: PortfolioState }) {
  const reduce = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const [isPending, start] = useTransition();
  const halted = state.policy.tradingHalted;

  function doHalt() {
    start(async () => {
      const res = await haltAllBots();
      if (res.ok) toast.success(`Trading halted. ${res.stopped ?? 0} bot${res.stopped === 1 ? "" : "s"} stopped.`);
      else toast.error(res.error ?? "Could not halt trading.");
      setConfirming(false);
    });
  }
  function doResume() {
    start(async () => {
      const res = await resumeTrading();
      if (res.ok) toast.success("Trading resumed. Restart bots when ready.");
      else toast.error(res.error ?? "Could not resume.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Kill switch */}
      <Card className={cn("p-5", halted && "border-negative/40")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)]", halted ? "bg-negative-soft text-negative" : "bg-accent-soft text-accent")}>
              <Power size={20} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Global kill switch</CardTitle>
                <Badge tone={halted ? "negative" : "positive"}>{halted ? "Halted" : "Live"}</Badge>
              </div>
              <p className="mt-1 max-w-md text-sm text-fg-subtle">
                {halted
                  ? "New entries are blocked across every bot. Resume, then restart each bot when you are ready."
                  : "Stops every running bot and blocks new entries instantly. Open positions are not force-closed."}
              </p>
            </div>
          </div>
          {halted ? (
            <Button onClick={doResume} disabled={isPending} size="md">Resume trading</Button>
          ) : (
            <Button onClick={() => setConfirming(true)} disabled={isPending} size="md" className="bg-negative text-white hover:bg-negative-hover">
              <Power size={16} weight="bold" /> Halt all bots
            </Button>
          )}
        </div>
      </Card>

      {/* Breaches */}
      {state.breaches.length > 0 && (
        <div className="space-y-2">
          {state.breaches.map((b, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-control)] border p-3 text-sm",
                b.severity === "critical" ? "border-negative/40 bg-negative-soft text-fg" : "border-warning/30 bg-warning-soft text-fg-muted",
              )}
            >
              <Warning size={16} weight="duotone" className={cn("mt-px shrink-0", b.severity === "critical" ? "text-negative" : "text-warning")} />
              <span>{b.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total equity" value={formatUSD(state.totalEquity)} />
        <Stat label="Gross exposure" value={`${state.grossExposurePct}%`} hint="Open notional as a share of total equity." tone={state.grossExposurePct > 100 ? "neg" : "neutral"} />
        <Stat label="Today P&L" value={`${state.todayNetPnl >= 0 ? "+" : ""}${formatUSD(state.todayNetPnl)}`} tone={state.todayNetPnl >= 0 ? "pos" : "neg"} />
        <Stat label="Live bots running" value={String(state.liveBotCount)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CorrelationCard correlation={state.correlation} />
        <div className="space-y-6">
          <ConcentrationCard title="Exposure by instrument" icon={<StackIcon size={15} weight="duotone" className="text-fg-subtle" />} slices={state.byInstrument} />
          <ConcentrationCard title="Exposure by session" slices={state.bySession} />
        </div>
      </div>

      <RiskBudgetCard state={state} disabled={isPending} />

      {/* Confirm halt */}
      <AnimatePresence>
        {confirming && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={() => setConfirming(false)} />
            <motion.div
              role="dialog"
              aria-modal
              className="fixed left-1/2 top-1/2 z-50 w-[min(92%,400px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-line bg-elevated p-6"
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-fg">Halt all trading?</h2>
                <button onClick={() => setConfirming(false)} className="text-fg-subtle hover:text-fg" aria-label="Close"><X size={18} /></button>
              </div>
              <p className="mt-2 text-sm text-fg-muted">
                Every running bot stops and new entries are blocked until you resume. Open positions stay open and can still hit their stops or targets.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={isPending}>Cancel</Button>
                <Button size="sm" className="bg-negative text-white hover:bg-negative-hover" onClick={doHalt} disabled={isPending}>
                  {isPending ? "Halting" : "Halt all bots"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "pos" | "neg" | "neutral" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</span>
        {hint && <InfoTip text={hint} />}
      </div>
      <p className={cn("mt-1.5 tnum text-xl font-bold", tone === "pos" && "text-positive", tone === "neg" && "text-negative", (!tone || tone === "neutral") && "text-fg")}>{value}</p>
    </Card>
  );
}

function CorrelationCard({ correlation }: { correlation: PortfolioState["correlation"] }) {
  const { labels, matrix } = correlation;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <GridFour size={15} weight="duotone" className="text-fg-subtle" />
        <CardTitle>Strategy correlation</CardTitle>
        <InfoTip text="How your accounts' daily returns move together over the last 30 days. High positive correlation means a bad day hits several bots at once. Diversification keeps these low." />
      </div>
      {labels.length < 2 ? (
        <p className="mt-6 text-sm text-fg-subtle">
          Correlation appears once two or more accounts have logged daily results.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${labels.length}, minmax(40px, 1fr))` }}>
            <div />
            {labels.map((l) => (
              <div key={`c-${l}`} className="truncate pb-1 text-center text-[10px] font-medium text-fg-subtle" title={l}>{l.slice(0, 6)}</div>
            ))}
            {labels.map((rowLabel, r) => (
              <CorrRow key={`r-${rowLabel}`} rowLabel={rowLabel} values={matrix[r]} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function CorrRow({ rowLabel, values }: { rowLabel: string; values: number[] }) {
  return (
    <>
      <div className="flex items-center justify-end truncate pr-2 text-[10px] font-medium text-fg-subtle" title={rowLabel}>{rowLabel.slice(0, 8)}</div>
      {values.map((v, i) => {
        const color = v >= 0 ? "var(--color-positive)" : "var(--color-negative)";
        const intensity = Math.min(100, Math.round(Math.abs(v) * 90) + 8);
        return (
          <div
            key={i}
            className="flex h-10 items-center justify-center rounded-[8px] border border-line"
            style={{ backgroundColor: `color-mix(in srgb, ${color} ${intensity}%, transparent)` }}
            title={`${v.toFixed(2)}`}
          >
            <span className="tnum text-[10px] font-semibold text-fg">{v.toFixed(1)}</span>
          </div>
        );
      })}
    </>
  );
}

function ConcentrationCard({ title, slices, icon }: { title: string; slices: ConcentrationSlice[]; icon?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        {icon}
        <CardTitle>{title}</CardTitle>
      </div>
      {slices.length === 0 ? (
        <p className="mt-4 text-sm text-fg-subtle">No open exposure right now.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {slices.slice(0, 6).map((s) => (
            <li key={s.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg">{s.key}</span>
                <span className="tnum text-xs text-fg-subtle">{formatUSD(s.notional)} · {s.pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, s.pct)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RiskBudgetCard({ state, disabled }: { state: PortfolioState; disabled: boolean }) {
  const [limit, setLimit] = useState<number>(state.policy.maxPortfolioDrawdown ?? 0);
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(state.bots.map((b) => [b.botId, b.riskWeight ?? 0])),
  );
  const [isPending, start] = useTransition();

  const totalWeight = useMemo(() => Object.values(weights).reduce((a, b) => a + (b || 0), 0), [weights]);

  function save() {
    start(async () => {
      const res = await setRiskPolicy({
        maxPortfolioDrawdown: limit > 0 ? limit : null,
        weights: state.bots.map((b) => ({ botId: b.botId, weight: weights[b.botId] > 0 ? weights[b.botId] : null })),
      });
      if (res.ok) toast.success("Risk policy saved.");
      else toast.error(res.error ?? "Could not save policy.");
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Pulse size={15} weight="duotone" className="text-fg-subtle" />
        <CardTitle>Risk budget</CardTitle>
        <InfoTip text="Set a hard daily loss limit for the whole portfolio (enforced server-side, like the kill switch) and allocate each bot a share of the budget." />
      </div>

      <div className="mt-4 max-w-xs">
        <label className="text-xs font-medium text-fg">Portfolio daily loss limit ($)</label>
        <div className="mt-1.5 flex items-center gap-2">
          <ClampedNumberInput value={limit} min={0} max={10_000_000} onCommit={setLimit} trailing="USD" className="w-40 tnum" ariaLabel="Portfolio daily loss limit" />
          <span className="text-xs text-fg-subtle">0 disables</span>
        </div>
      </div>

      {state.bots.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">Per-bot risk weight</span>
            <span className={cn("tnum text-xs", totalWeight > 100 ? "text-negative" : "text-fg-subtle")}>{totalWeight}% allocated</span>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {state.bots.map((b) => (
              <li key={b.botId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{b.botName}</p>
                  <p className="text-[11px] text-fg-subtle">{b.accountNickname} · {b.mode === "LIVE" ? "Live" : "Paper"}</p>
                </div>
                <ClampedNumberInput
                  value={weights[b.botId] ?? 0}
                  min={0}
                  max={100}
                  onCommit={(v) => setWeights((w) => ({ ...w, [b.botId]: v }))}
                  trailing="%"
                  className="w-24 tnum"
                  ariaLabel={`Risk weight for ${b.botName}`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button size="sm" onClick={save} disabled={disabled || isPending}>{isPending ? "Saving" : "Save risk policy"}</Button>
      </div>
    </Card>
  );
}
