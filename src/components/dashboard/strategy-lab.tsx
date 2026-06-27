"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X, Plus, Spinner, Star } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClampedNumberInput } from "@/components/ui/clamped-number-input";
import { InfoTip } from "@/components/ui/info-tip";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { EquityCurve } from "./equity-curve";
import {
  PARAM_BOUNDS,
  PARAM_LABELS,
  formatParamValue,
  displayParamValue,
  parseRawParamValue,
  type Bound,
  type StrategyParams,
} from "@/lib/strategy-schema";
import type { AdjustmentRow } from "@/lib/queries";
import { backtestStrategy, type Bar } from "@/lib/engine/backtest";
import { optimizeStrategy, monteCarlo, type SweepRow, type Objective } from "@/lib/engine/optimize";
import { Histogram } from "./charts";
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
  plan,
  accountId = null,
  strategyId = null,
}: {
  initialParams: StrategyParams;
  changeLog: AdjustmentRow[];
  pending: AdjustmentRow[];
  autoAdjustmentsUsed: number;
  plan: string;
  accountId?: string | null;
  strategyId?: string | null;
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

  const customKeys = useMemo(
    () => Object.keys(params).filter((k) => !(k in PARAM_LABELS)),
    [params]
  );

  // Backtest the strategy over real historical bars for its instrument. The bars
  // are fetched once; the simulation re-runs instantly as parameters change, so
  // the sandbox reflects the actual breakout logic instead of a fabricated curve.
  const instrument = typeof params.instrument === "string" && params.instrument ? params.instrument : "NQ";
  const [bars, setBars] = useState<Bar[] | null>(null);
  const [barsError, setBarsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBars(null);
      setBarsError(null);
      try {
        const res = await fetch(`/api/market/history?symbol=${encodeURIComponent(instrument)}&days=180`);
        if (!res.ok) throw new Error("history unavailable");
        const data = await res.json();
        if (cancelled) return;
        const fetched: Bar[] = data.bars ?? [];
        if (fetched.length < 5) setBarsError(`Not enough historical data for ${instrument} to backtest.`);
        setBars(fetched);
      } catch {
        if (!cancelled) setBarsError("Couldn't load historical data for the backtest.");
      }
    })();
    return () => { cancelled = true; };
  }, [instrument]);

  const backtest = useMemo(() => {
    if (!bars || bars.length < 5) return null;
    return backtestStrategy(bars, {
      riskPct: params.riskPct,
      rrTarget: params.rrTarget,
      stopLossPct: typeof params.stopLossPct === "number" ? params.stopLossPct : undefined,
      trendFilter: params.trendFilter,
      direction: params.direction === "SHORT" ? "SHORT" : params.direction === "LONG" ? "LONG" : "BOTH",
    });
  }, [bars, params]);

  // Richer backtest analysis derived from the same run: an R-multiple spread and
  // a seeded Monte Carlo confidence band. Both come from real simulated trades.
  const rBuckets = useMemo(() => {
    if (!backtest) return [];
    // Edge-inclusive predicates that match the displayed labels exactly: an exact
    // -0.5R lands in "≤ -0.5R" and an exact +1.5R lands in "≥ +1.5R".
    const defs: { label: string; test: (r: number) => boolean }[] = [
      { label: "≤ -0.5R", test: (r) => r <= -0.5 },
      { label: "-0.5 to +0.5R", test: (r) => r > -0.5 && r < 0.5 },
      { label: "+0.5 to +1.5R", test: (r) => r >= 0.5 && r < 1.5 },
      { label: "≥ +1.5R", test: (r) => r >= 1.5 },
    ];
    return defs.map((d) => ({
      label: d.label,
      count: backtest.tradeReturns.filter(d.test).length,
    }));
  }, [backtest]);

  const mc = useMemo(() => {
    if (!backtest) return null;
    return monteCarlo(backtest.tradeReturns, typeof params.riskPct === "number" ? params.riskPct : 1);
  }, [backtest, params.riskPct]);

  // Optimization sweep over a bounded grid of the loaded bars.
  const [objective, setObjective] = useState<Objective>("return");
  const [sweep, setSweep] = useState<SweepRow[] | null>(null);
  const [sweeping, setSweeping] = useState(false);
  // Monotonic id so a queued sweep that finishes after its inputs changed is
  // discarded instead of repopulating the table with stale rankings.
  const sweepRunId = useRef(0);

  // Stale results are misleading: clear the ranking whenever an input that feeds
  // the sweep changes (bars, objective, direction, or risk per trade).
  useEffect(() => {
    sweepRunId.current += 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- invalidate stale sweep on input change
    setSweep(null);
  }, [bars, objective, params.direction, params.riskPct]);

  function runOptimization() {
    if (!bars || bars.length < 5) return;
    const runId = ++sweepRunId.current;
    const sweepBars = bars;
    const sweepObjective = objective;
    const sweepRiskPct = typeof params.riskPct === "number" ? params.riskPct : 1;
    const sweepDirection: "LONG" | "SHORT" | "BOTH" =
      params.direction === "SHORT" ? "SHORT" : params.direction === "LONG" ? "LONG" : "BOTH";
    setSweeping(true);
    // Defer so the button shows its pending state before the synchronous sweep.
    setTimeout(() => {
      // Bail before the synchronous sweep if inputs already changed.
      if (runId !== sweepRunId.current) {
        setSweeping(false);
        return;
      }
      const rows = optimizeStrategy(sweepBars, { riskPct: sweepRiskPct, direction: sweepDirection }, sweepObjective);
      setSweeping(false);
      setSweep(rows);
    }, 0);
  }

  function applySweep(row: SweepRow) {
    // Apply the swept edge params into the lab; the user reviews then Saves, where
    // parseStrategyParams re-enforces every bound (no ceiling bypass).
    setParams((p) => ({
      ...p,
      rrTarget: row.params.rrTarget,
      trendFilter: row.params.trendFilter,
      stopLossPct: row.params.stopLossPct,
    }));
  }

  const activePaidFeatures = useMemo(() => {
    const features = [];
    if (params.trendFilter) features.push("Trend Filter (AI SMA)");
    if (params.reEntry) features.push("Re-entry Strategy");
    if (params.minRange !== 0.3) features.push("Min Range Volatility Limit"); // default is 0.3
    if (params.maxRange !== 3) features.push("Max Range Volatility Limit"); // default is 3
    if (params.maxTrades !== 8) features.push("Max Trades Override"); // default is 8
    return features;
  }, [params]);

  const showPaidWarning = plan === "FREE" && activePaidFeatures.length > 0;

  function set<K extends keyof StrategyParams>(key: K, value: StrategyParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function commit() {
    const snapshot = params;
    const prev = saved;
    setError(null);
    startTransition(async () => {
      const res = await saveStrategy(snapshot, accountId ?? undefined, strategyId ?? undefined);
      if (!res.ok) {
        setError(res.error ?? "Could not save changes.");
        return;
      }
      const now = new Date().toISOString();
      const entries: LogEntry[] = (Object.keys(PARAM_LABELS) as (keyof StrategyParams)[])
        .filter((k) => prev[k] !== snapshot[k])
        .map((k) => ({
          id: `local-${k}-${now}`,
          param: String(PARAM_LABELS[k as keyof typeof PARAM_LABELS] || k),
          old: formatParamValue(k as keyof StrategyParams, prev[k] as number | boolean),
          next: formatParamValue(k as keyof StrategyParams, snapshot[k] as number | boolean),
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
    const suggestion = suggestions.find((s) => s.id === id);
    startTransition(async () => {
      const res = approve ? await approveSuggestion(id) : await rejectSuggestion(id);
      if (!res.ok) {
        setError(res.error ?? "Could not update the suggestion.");
        return;
      }
      // An approved suggestion is now part of the saved params server-side. Mirror
      // it into local state so a later save doesn't overwrite it with a stale value.
      if (approve && suggestion?.paramKey && suggestion.paramKey in PARAM_LABELS) {
        const k = suggestion.paramKey as keyof StrategyParams;
        const v = parseRawParamValue(k, suggestion.newValue);
        setParams((p) => ({ ...p, [k]: v }) as StrategyParams);
        setSaved((p) => ({ ...p, [k]: v }) as StrategyParams);
      }
      setSuggestions((s) => s.filter((x) => x.id !== id));
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      {/* Editor */}
      <div className="space-y-4">
        {showPaidWarning && (
          <div className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/10 p-5">
            <h3 className="text-sm font-semibold text-accent">
              You are using {activePaidFeatures.length} premium feature{activePaidFeatures.length > 1 ? "s" : ""}
            </h3>
            <p className="mt-1.5 text-sm text-fg-subtle">
              These advanced features are fully active on your Paper account so you can test their power. 
              To use them on a Live broker account, you must upgrade.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-fg-muted">
              {activePaidFeatures.map(f => <li key={f}>{f}</li>)}
            </ul>
            <div className="mt-4 flex">
              <Button href="/dashboard/billing" size="sm" variant="outline" className="border-accent text-accent hover:bg-accent/20 hover:text-accent">
                Upgrade to Live Trade
              </Button>
            </div>
          </div>
        )}

        <Group title="Entry & exit" tip="When the bot enters and how far it targets profit relative to the risk on each trade.">
          <NumberField bound={PARAM_BOUNDS.rangeMinutes} value={params.rangeMinutes} onChange={(v) => set("rangeMinutes", v)} />
          <NumberField bound={PARAM_BOUNDS.rrTarget} value={params.rrTarget} onChange={(v) => set("rrTarget", v)} />
        </Group>

        <Group title="Range filters" premium tip="Skip sessions that are too quiet or too wild. The day's range is measured against a normal ~1% day.">
          <NumberField bound={PARAM_BOUNDS.minRange} value={params.minRange} onChange={(v) => set("minRange", v)} />
          <NumberField bound={PARAM_BOUNDS.maxRange} value={params.maxRange} onChange={(v) => set("maxRange", v)} />
        </Group>

        <Group title="Risk controls" tip="How much you risk per trade, plus the daily limits that stop the bot to protect the account.">
          <NumberField bound={PARAM_BOUNDS.riskPct} value={params.riskPct} onChange={(v) => set("riskPct", v)} />
          <NumberField bound={PARAM_BOUNDS.dailyLoss} value={params.dailyLoss} onChange={(v) => set("dailyLoss", v)} />
          <NumberField bound={PARAM_BOUNDS.maxTrades} value={params.maxTrades} onChange={(v) => set("maxTrades", v)} premium />
        </Group>

        <Group title="Filters" premium tip="Optional confirmations that must agree before a trade is taken.">
          <ToggleField label={PARAM_LABELS.trendFilter} value={params.trendFilter} onChange={(v) => set("trendFilter", v)} help="Only take trades that agree with the 20-period trend." />
          <ToggleField label={PARAM_LABELS.reEntry} value={params.reEntry} onChange={(v) => set("reEntry", v)} help="Wait for a pullback inside the range before re-entering." />
        </Group>

        <Group title="Custom parameters" tip="Advanced extra values stored with your strategy for custom logic. Leave empty if unsure.">

            <div className="space-y-4">
            {customKeys.map((k) => (
              <div key={k} className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`custom-${k}`}>{k}</Label>
                  <ClampedNumberInput
                    id={`custom-${k}`}
                    value={Number(params[k as keyof StrategyParams]) || 0}
                    onCommit={(v) => set(k as keyof StrategyParams, v as StrategyParams[keyof StrategyParams])}
                    className="w-full"
                    ariaLabel={k}
                    allowNegative
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="px-2 mb-0.5 shrink-0" 
                  onClick={() => {
                    const p = { ...params };
                    delete p[k as keyof StrategyParams];
                    setParams(p);
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newKey = `customParam${customKeys.length + 1}`;
                set(newKey as keyof StrategyParams, 0 as StrategyParams[keyof StrategyParams]);
              }}
            >
              <Plus size={14} className="mr-1" /> Add Parameter
            </Button>
          </div>
        </Group>
      </div>

      {/* Side: change log + learning */}
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <CardTitle>Sandbox backtest</CardTitle>
            <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              {instrument} · 180d
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-subtle">
            Your rules run over real historical bars. An estimate, not a guarantee.
          </p>
          <div className="mt-4">
            {barsError ? (
              <div className="flex h-[200px] items-center justify-center text-center text-sm text-fg-subtle">
                {barsError}
              </div>
            ) : !backtest ? (
              <div className="flex h-[200px] items-center justify-center text-fg-subtle">
                <Spinner size={20} className="animate-spin" />
              </div>
            ) : (
              <>
                <EquityCurve series={backtest.series} />
                <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { k: "Return", v: `${backtest.totalReturnPct >= 0 ? "+" : ""}${backtest.totalReturnPct.toFixed(1)}%`, tone: backtest.totalReturnPct >= 0 ? "text-profit" : "text-negative" },
                    { k: "Win rate", v: `${backtest.winRate.toFixed(0)}%`, tone: "text-fg" },
                    { k: "Max DD", v: `-${backtest.maxDrawdownPct.toFixed(1)}%`, tone: "text-negative" },
                    { k: "Trades", v: String(backtest.trades), tone: "text-fg" },
                  ].map((s) => (
                    <div key={s.k} className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-center">
                      <dt className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{s.k}</dt>
                      <dd className={cn("mt-0.5 text-sm font-semibold tnum", s.tone)}>{s.v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
                  Conservative model: on a day that touches both the stop and the target, the stop is
                  assumed to hit first. Daily bars can&apos;t resolve true intraday order, so real fills may differ.
                </p>
              </>
            )}
          </div>
        </Card>

        {backtest && backtest.trades >= 1 && (
          <Card className="p-5">
            <CardTitle>Edge analysis</CardTitle>
            <p className="mt-1 text-xs text-fg-subtle">How the simulated trades are distributed, and the spread of outcomes if the same edge repeats.</p>
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">R-multiple spread</p>
              <Histogram data={rBuckets} />
            </div>
            {mc && (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Monte Carlo ({mc.runs} runs)
                </p>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { k: "P5 return", v: `${mc.p5ReturnPct >= 0 ? "+" : ""}${mc.p5ReturnPct.toFixed(0)}%`, tone: mc.p5ReturnPct >= 0 ? "text-profit" : "text-negative" },
                    { k: "Median", v: `${mc.p50ReturnPct >= 0 ? "+" : ""}${mc.p50ReturnPct.toFixed(0)}%`, tone: mc.p50ReturnPct >= 0 ? "text-profit" : "text-negative" },
                    { k: "P95 return", v: `${mc.p95ReturnPct >= 0 ? "+" : ""}${mc.p95ReturnPct.toFixed(0)}%`, tone: "text-fg" },
                    { k: "Risk of ruin", v: `${mc.riskOfRuinPct.toFixed(0)}%`, tone: mc.riskOfRuinPct > 10 ? "text-negative" : "text-fg" },
                  ].map((s) => (
                    <div key={s.k} className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-center">
                      <dt className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{s.k}</dt>
                      <dd className={cn("mt-0.5 text-sm font-semibold tnum", s.tone)}>{s.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <CardTitle>Find better settings</CardTitle>
            <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              Sweep
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-subtle">
            Backtests a grid of reward, stop, and trend-filter combinations over the same bars, then ranks them.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <select
              className="h-9 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={objective}
              onChange={(e) => setObjective(e.target.value as Objective)}
              aria-label="Optimization objective"
            >
              <option value="return">Maximise return</option>
              <option value="profitFactor">Maximise profit factor</option>
              <option value="winRate">Maximise win rate</option>
              <option value="drawdown">Minimise drawdown</option>
            </select>
            <Button size="sm" onClick={runOptimization} disabled={!bars || bars.length < 5 || sweeping}>
              {sweeping ? <Spinner size={15} className="animate-spin" /> : <Star size={15} weight="fill" />}
              {sweeping ? "Searching" : "Optimize"}
            </Button>
          </div>

          {sweep && (
            sweep.length === 0 ? (
              <p className="mt-4 text-sm text-fg-subtle">No combination produced enough trades to rank on this instrument.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-[var(--radius-control)] border border-line">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line bg-surface text-fg-subtle">
                      <th className="px-2 py-1.5 text-left font-medium">R:R</th>
                      <th className="px-2 py-1.5 text-left font-medium">Stop</th>
                      <th className="px-2 py-1.5 text-left font-medium">Trend</th>
                      <th className="px-2 py-1.5 text-right font-medium">Return</th>
                      <th className="px-2 py-1.5 text-right font-medium">DD</th>
                      <th className="px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {sweep.map((row, i) => (
                      <tr key={i} className="border-b border-line/50 last:border-0">
                        <td className="tnum px-2 py-1.5">{row.params.rrTarget}R</td>
                        <td className="tnum px-2 py-1.5">{row.params.stopLossPct}%</td>
                        <td className="px-2 py-1.5">{row.params.trendFilter ? "On" : "Off"}</td>
                        <td className={cn("tnum px-2 py-1.5 text-right font-medium", row.totalReturnPct >= 0 ? "text-profit" : "text-negative")}>
                          {row.totalReturnPct >= 0 ? "+" : ""}{row.totalReturnPct.toFixed(0)}%
                        </td>
                        <td className="tnum px-2 py-1.5 text-right text-negative">-{row.maxDrawdownPct.toFixed(0)}%</td>
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => applySweep(row)} className="rounded-[var(--radius-pill)] bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent hover:text-[var(--color-on-accent)]">
                            Apply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </Card>

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
          <div className="flex items-center justify-between">
            <CardTitle>Bot learning</CardTitle>
            <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
              </span>
              Neural Engine Active
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">Auto-adjustments used</span>
              <span className="tnum text-fg">
                {autoAdjustmentsUsed} / {AUTO_LIMIT}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-all duration-1000 ease-out"
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

function Group({ title, children, premium, tip }: { title: string; children: React.ReactNode; premium?: boolean; tip?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5">
          <CardTitle>{title}</CardTitle>
          {tip && <InfoTip text={tip} />}
        </span>
        {premium && (
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            <Star size={10} weight="fill" /> Premium
          </span>
        )}
      </div>
      <div className="mt-4 space-y-5">{children}</div>
    </Card>
  );
}

function NumberField({
  bound,
  value,
  onChange,
  premium,
}: {
  bound: Bound;
  value: number;
  onChange: (v: number) => void;
  premium?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        <span className="inline-flex items-center gap-1.5">
          {bound.label}
          {premium && (
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
              <Star size={9} weight="fill" /> Premium
            </span>
          )}
        </span>
      </Label>
      <ClampedNumberInput
        id={id}
        value={value}
        min={bound.min}
        max={bound.max}
        onCommit={onChange}
        trailing={bound.suffix || undefined}
        className="tnum w-32"
        ariaLabel={bound.label}
      />
      <p className="text-xs leading-relaxed text-fg-subtle">
        {bound.help} <span className="text-fg-faint">Range {bound.min} to {bound.max}{bound.suffix ?? ""}.</span>
      </p>
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
      <span className="mt-0.5">
        <Switch checked={value} onChange={onChange} label={label} />
      </span>
    </div>
  );
}
