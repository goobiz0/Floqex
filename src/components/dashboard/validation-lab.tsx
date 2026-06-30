"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Play, LockSimple, ChartLineUp, ArrowsOut, SpinnerGap } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";
import { runStrategyValidation, type ValidationResponse } from "@/app/dashboard/strategy/actions";
import type { Interval } from "@/lib/engine/market-data";
import type { ValidationReport, MonteCarloBands, RobustnessGrid } from "@/lib/engine/validation";
import { EdgeScorecard } from "./edge-scorecard";
import { DistributionChart } from "./calculators/shared";

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
];

type DefaultParams = {
  riskPct: number;
  rrTarget: number;
  stopLossPct: number;
  trendFilter: boolean;
  direction: "LONG" | "SHORT" | "BOTH";
  minRange: number;
  maxRange: number;
};

export function ValidationLab({
  strategyId,
  instrument,
  defaults,
}: {
  strategyId: string | null;
  instrument: string;
  defaults: DefaultParams;
}) {
  const [interval, setIntervalState] = useState<Interval>("5m");
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const reduce = useReducedMotion();

  function run() {
    setError(null);
    start(async () => {
      const res: ValidationResponse = await runStrategyValidation({
        strategyId: strategyId ?? undefined,
        instrument,
        interval,
        ...defaults,
      });
      if (!res.ok) {
        setError(res.error);
        setReport(null);
        return;
      }
      setReport(res.report);
      setLocked(res.locked);
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Validation Lab</CardTitle>
              <InfoTip text="Walks real intraday bars in true sequence, splits history into in-sample and out-of-sample, stress-tests with Monte Carlo, and sweeps nearby settings. The Edge Score tells you if the edge is real or curve-fit." />
            </div>
            <p className="mt-1 text-sm text-fg-subtle">
              Prove the edge on real intraday data for{" "}
              <span className="font-semibold text-fg">{instrument}</span> before you risk capital.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Segmented
              size="sm"
              options={INTERVALS}
              value={interval}
              onChange={(v) => setIntervalState(v as Interval)}
            />
            <Button size="sm" onClick={run} disabled={isPending}>
              {isPending ? <SpinnerGap size={15} className="animate-spin" /> : <Play size={15} weight="fill" />}
              {isPending ? "Validating" : "Run validation"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-[var(--radius-control)] border border-negative-soft bg-negative-soft/40 p-3 text-sm text-negative">
            {error}
          </div>
        )}

        {!report && !error && (
          <div className="mt-6">
            {isPending ? (
              <ValidationSkeleton />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line bg-surface/40 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-accent">
                  <ChartLineUp size={24} weight="duotone" />
                </div>
                <p className="max-w-sm text-sm text-fg-subtle">
                  Pick a timeframe and run the suite. Your strategy walks real {instrument} bars, then we score how durable the edge looks.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {report && (
        <motion.div
          className="space-y-4"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          <EdgeScorecard edge={report.edge} />

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <DataPill label={`${report.dataWindow.bars.toLocaleString()} bars`} />
            <DataPill label={`${report.dataWindow.days} days`} />
            <DataPill label={report.dataWindow.interval} />
            <DataPill label={report.dataWindow.source} />
            <span className="text-fg-faint">Real history only. Estimates, not guarantees.</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SampleVsHoldout wf={report} />
            <LockableCard
              locked={locked}
              title="Monte Carlo outlook"
              tip="Resamples your real trade sequence 1,000 times to map the range of plausible futures. The lighter band is the 5th to 95th percentile, the denser core is the 25th to 75th, and the line is the median path."
            >
              <MonteCarloBandChart bands={report.monteCarlo} />
              {report.monteCarlo.finalsHistogram.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Final equity distribution</p>
                  <DistributionChart bins={report.monteCarlo.finalsHistogram} baseline={10000} format={fmtMoney} height={120} />
                </div>
              )}
              <dl className="mt-4 grid grid-cols-3 gap-2">
                <MetricCell k="Worst 5%" v={fmtMoney(report.monteCarlo.finalP5)} tone={report.monteCarlo.finalP5 >= 10000 ? "pos" : "neg"} />
                <MetricCell k="Median" v={fmtMoney(report.monteCarlo.finalP50)} tone="neutral" />
                <MetricCell k="Best 5%" v={fmtMoney(report.monteCarlo.finalP95)} tone="pos" />
                <MetricCell k="Prob of profit" v={`${report.monteCarlo.probProfit.toFixed(0)}%`} tone={report.monteCarlo.probProfit >= 50 ? "pos" : "neg"} />
                <MetricCell k="Risk of ruin" v={`${report.monteCarlo.riskOfRuin.toFixed(0)}%`} tone={report.monteCarlo.riskOfRuin > 20 ? "neg" : "pos"} />
              </dl>
            </LockableCard>
          </div>

          <LockableCard
            locked={locked}
            title="Parameter robustness"
            tip="Sweeps reward:risk against stop distance. A real edge stays green across the neighbourhood. A single bright cell in a sea of red is the signature of an overfit."
            icon={<ArrowsOut size={15} weight="duotone" className="text-fg-subtle" />}
          >
            <RobustnessHeatmap grid={report.robustness} />
          </LockableCard>
        </motion.div>
      )}
    </div>
  );
}

function DataPill({ label }: { label: string }) {
  return (
    <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-2.5 py-0.5 font-medium uppercase tracking-wider text-fg-subtle">
      {label}
    </span>
  );
}

function MetricCell({ k, v, tone }: { k: string; v: string; tone: "pos" | "neg" | "neutral" }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-center">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{k}</dt>
      <dd className={cn("mt-0.5 tnum text-sm font-semibold", tone === "pos" && "text-positive", tone === "neg" && "text-negative", tone === "neutral" && "text-fg")}>{v}</dd>
    </div>
  );
}

function LockableCard({
  locked,
  title,
  tip,
  icon,
  children,
}: {
  locked: boolean;
  title: string;
  tip: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="relative p-5">
      <div className="flex items-center gap-2">
        {icon}
        <CardTitle>{title}</CardTitle>
        <InfoTip text={tip} />
      </div>
      <div className={cn("mt-4", locked && "pointer-events-none select-none blur-sm")} aria-hidden={locked}>
        {children}
      </div>
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[inherit] bg-overlay/70 backdrop-blur-[2px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
            <LockSimple size={18} weight="duotone" />
          </div>
          <p className="max-w-[15rem] text-center text-xs text-fg-muted">
            Walk-forward, Monte Carlo and robustness are part of the Pro plan.
          </p>
          <Button href="/dashboard/billing" size="sm" variant="outline">
            Upgrade to Pro
          </Button>
        </div>
      )}
    </Card>
  );
}

function ValidationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-28 rounded-[var(--radius-card)]" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="skeleton h-56 rounded-[var(--radius-card)]" />
        <div className="skeleton h-56 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

// ───────────────────────── Charts (pure SVG, real data) ─────────────────────

const CW = 520;
const CH = 200;

function linePath(values: number[], min: number, max: number, w = CW, h = CH): string {
  if (values.length < 2) return "";
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 10 - ((v - min) / span) * (h - 20);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function SampleVsHoldout({ wf }: { wf: ValidationReport }) {
  const is = wf.walkForward.inSample;
  const oos = wf.walkForward.outOfSample;
  const isVals = is.series.map((p) => p.equity);
  const oosVals = oos.series.map((p) => p.equity);
  const all = [...isVals, ...oosVals];
  const min = Math.min(...all, 10000);
  const max = Math.max(...all, 10000);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>In-sample vs out-of-sample</CardTitle>
          <InfoTip text="The optimiser only sees the first 60% of history. The held-out 40% is the honest test. If the dashed curve falls apart, the edge was curve-fit." />
        </div>
        <Badge tone={wf.walkForward.degradation >= 0.6 ? "positive" : wf.walkForward.degradation >= 0.3 ? "warning" : "negative"} mono>
          {Math.round(Math.max(0, wf.walkForward.degradation) * 100)}% kept
        </Badge>
      </div>
      <svg viewBox={`0 0 ${CW} ${CH}`} className="mt-4 w-full" preserveAspectRatio="none" role="img" aria-label="In-sample versus out-of-sample equity curves">
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p} x1="0" y1={CH * p} x2={CW} y2={CH * p} stroke="var(--color-line)" strokeWidth="1" />
        ))}
        <motion.path 
          d={linePath(isVals, min, max)} 
          fill="none" 
          stroke="var(--color-accent)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <motion.path 
          d={linePath(oosVals, min, max)} 
          fill="none" 
          stroke="var(--color-fg-muted)" 
          strokeWidth="2" 
          strokeDasharray="5 4" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 1.5 }}
        />
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Legend swatch="var(--color-accent)" label="In-sample" value={`${is.totalReturnPct >= 0 ? "+" : ""}${is.totalReturnPct.toFixed(1)}%`} />
        <Legend swatch="var(--color-fg-muted)" dashed label="Out-of-sample" value={`${oos.totalReturnPct >= 0 ? "+" : ""}${oos.totalReturnPct.toFixed(1)}%`} />
      </div>
    </Card>
  );
}

function Legend({ swatch, label, value, dashed }: { swatch: string; label: string; value: string; dashed?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-fg-muted">
        <span className="inline-block h-0.5 w-4 rounded-full" style={dashed ? { backgroundImage: `repeating-linear-gradient(90deg, ${swatch} 0 4px, transparent 4px 7px)` } : { backgroundColor: swatch }} />
        {label}
      </span>
      <span className={cn("tnum text-xs font-semibold", value.startsWith("-") ? "text-negative" : "text-positive")}>{value}</span>
    </div>
  );
}

function MonteCarloBandChart({ bands }: { bands: MonteCarloBands }) {
  const reduce = useReducedMotion();
  if (bands.steps.length < 2) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-fg-subtle">Not enough trades to simulate yet.</div>;
  }
  const all = bands.steps.flatMap((s) => [s.p5, s.p95]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const n = bands.steps.length;
  const x = (i: number) => (i / (n - 1)) * CW;
  const y = (v: number) => CH - 10 - ((v - min) / span) * (CH - 20);

  // Outer band: 5th to 95th percentile. Inner core: 25th to 75th, drawn denser.
  const outerUpper = bands.steps.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.p95).toFixed(1)}`).join(" ");
  const outerLowerRev = [...bands.steps].reverse().map((s, idx) => `L${x(n - 1 - idx).toFixed(1)},${y(s.p5).toFixed(1)}`).join(" ");
  const outerBand = `${outerUpper} ${outerLowerRev} Z`;
  const innerUpper = bands.steps.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.p75).toFixed(1)}`).join(" ");
  const innerLowerRev = [...bands.steps].reverse().map((s, idx) => `L${x(n - 1 - idx).toFixed(1)},${y(s.p25).toFixed(1)}`).join(" ");
  const innerBand = `${innerUpper} ${innerLowerRev} Z`;
  const median = bands.steps.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.p50).toFixed(1)}`).join(" ");
  const startY = y(bands.steps[0].p50);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Monte Carlo equity confidence band, 5th to 95th and 25th to 75th percentiles">
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p} x1="0" y1={CH * p} x2={CW} y2={CH * p} stroke="var(--color-line)" strokeWidth="1" />
        ))}
        <line x1="0" y1={startY} x2={CW} y2={startY} stroke="var(--color-line-strong)" strokeWidth="1" strokeDasharray="3 3" />
        <path d={outerBand} fill="var(--color-accent)" fillOpacity="0.12" stroke="none" />
        <path d={innerBand} fill="var(--color-accent)" fillOpacity="0.22" stroke="none" />
        <motion.path
          d={median}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>
      <div className="pointer-events-none absolute right-1 top-0 flex h-full flex-col justify-between py-1 text-right">
        <span className="tnum text-[10px] text-fg-faint">{fmtMoney(max)}</span>
        <span className="tnum text-[10px] text-fg-faint">{fmtMoney(min)}</span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-fg-faint">
        <span>Trade 0</span>
        <span className="tnum">{n - 1} trades</span>
      </div>
    </div>
  );
}

function RobustnessHeatmap({ grid }: { grid: RobustnessGrid }) {
  const maxAbs = Math.max(1, ...grid.cells.map((c) => Math.abs(c.totalReturnPct)));
  const cell = (rr: number, stop: number) => grid.cells.find((c) => c.rr === rr && c.stop === stop);

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${grid.rrAxis.length}, minmax(56px, 1fr))` }}>
        <div className="flex items-end justify-center pb-1 text-[10px] font-medium uppercase tracking-wider text-fg-faint">
          stop / rr
        </div>
        {grid.rrAxis.map((rr) => (
          <div key={`h-${rr}`} className="pb-1 text-center tnum text-[11px] font-medium text-fg-subtle">
            {rr}R
          </div>
        ))}
        {grid.stopAxis.map((stop, rowIndex) => (
          <Row key={`r-${stop}`} stop={stop} rrAxis={grid.rrAxis} cell={cell} maxAbs={maxAbs} rowIndex={rowIndex} />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-fg-faint">
        {Math.round(grid.positiveFraction * 100)}% of nearby settings stay profitable.
      </p>
    </div>
  );
}

function Row({
  stop,
  rrAxis,
  cell,
  maxAbs,
  rowIndex,
}: {
  stop: number;
  rrAxis: number[];
  cell: (rr: number, stop: number) => { totalReturnPct: number; trades: number } | undefined;
  maxAbs: number;
  rowIndex: number;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-2 tnum text-[11px] font-medium text-fg-subtle">{stop}%</div>
      {rrAxis.map((rr, colIndex) => {
        const c = cell(rr, stop);
        const val = c?.totalReturnPct ?? 0;
        const intensity = Math.min(100, Math.round((Math.abs(val) / maxAbs) * 90) + 10);
        const color = val >= 0 ? "var(--color-positive)" : "var(--color-negative)";
        return (
          <motion.div
            key={`${rr}-${stop}`}
            className="flex h-12 flex-col items-center justify-center rounded-[8px] border border-line"
            style={{ backgroundColor: `color-mix(in srgb, ${color} ${intensity}%, transparent)` }}
            title={`${rr}R, ${stop}% stop: ${val >= 0 ? "+" : ""}${val.toFixed(1)}% over ${c?.trades ?? 0} trades`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: (rowIndex * rrAxis.length + colIndex) * 0.04, ease: "easeOut" }}
          >
            <span className="tnum text-[11px] font-semibold text-fg">{val >= 0 ? "+" : ""}{val.toFixed(0)}%</span>
          </motion.div>
        );
      })}
    </>
  );
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
