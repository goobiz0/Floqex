"use client";

import { useState, useTransition } from "react";
import { Play, SpinnerGap, ArrowLeft } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ClampedNumberInput } from "@/components/ui/clamped-number-input";
import { runDualValidation } from "@/app/dashboard/strategy/actions";
import type { Interval } from "@/lib/engine/market-data";
import type { ValidationReport } from "@/lib/engine/validation";
import Link from "next/link";

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
];

type StrategyParams = {
  riskPct: number;
  rrTarget: number;
  stopLossPct: number;
  trendFilter: boolean;
  direction: "LONG" | "SHORT" | "BOTH";
  minRange: number;
  maxRange: number;
  trailingStopPct: number;
  atrStopMultiple: number;
};

const DEFAULT_PARAMS: StrategyParams = {
  riskPct: 1,
  rrTarget: 1.8,
  stopLossPct: 0.75,
  trendFilter: false,
  direction: "BOTH",
  minRange: 0.2,
  maxRange: 3,
  trailingStopPct: 0,
  atrStopMultiple: 0,
};

export function ComparisonLab() {
  const [instrument, setInstrument] = useState("NQ");
  const [interval, setIntervalState] = useState<Interval>("5m");
  const [baseParams, setBaseParams] = useState<StrategyParams>(DEFAULT_PARAMS);
  const [compareParams, setCompareParams] = useState<StrategyParams>({
    ...DEFAULT_PARAMS,
    rrTarget: 2.2, // Some different default for the compare side
  });

  const [baseReport, setBaseReport] = useState<ValidationReport | null>(null);
  const [compareReport, setCompareReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function run() {
    setError(null);
    start(async () => {
      const res = await runDualValidation(
        { instrument, interval, ...baseParams },
        { instrument, interval, ...compareParams }
      );
      if (!res.base.ok || !res.compare.ok) {
        setError("Error running validation.");
        setBaseReport(null);
        setCompareReport(null);
        return;
      }
      setBaseReport(res.base.report);
      setCompareReport(res.compare.report);
    });
  }

  function renderParams(title: string, params: StrategyParams, setParams: (p: StrategyParams) => void) {
    return (
      <Card className="p-4 space-y-4 border border-line bg-surface/20">
        <h3 className="font-semibold text-fg">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-subtle">Reward:Risk</label>
            <ClampedNumberInput
              value={params.rrTarget}
              min={0.1}
              max={10}
              onCommit={(v) => setParams({ ...params, rrTarget: v })}
              className="tnum h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface text-sm"
              ariaLabel="RR Target"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-subtle">Stop Loss %</label>
            <ClampedNumberInput
              value={params.stopLossPct}
              min={0.1}
              max={10}
              onCommit={(v) => setParams({ ...params, stopLossPct: v })}
              className="tnum h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface text-sm"
              ariaLabel="Stop Loss"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-subtle">Direction</label>
            <select
              value={params.direction}
              onChange={(e) => setParams({ ...params, direction: e.target.value as "LONG" | "SHORT" | "BOTH" })}
              className="h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg"
            >
              <option value="LONG">Long Only</option>
              <option value="SHORT">Short Only</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-subtle">Trend Filter</label>
            <select
              value={params.trendFilter ? "true" : "false"}
              onChange={(e) => setParams({ ...params, trendFilter: e.target.value === "true" })}
              className="h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg"
            >
              <option value="false">Off</option>
              <option value="true">On</option>
            </select>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/strategy" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors">
        <ArrowLeft size={16} /> Back to Strategies
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-fg">Comparison Mode</h1>
        <p className="text-sm text-fg-subtle mt-1">Compare two strategies side-by-side to see which performs better on the same historical data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderParams("Base Strategy", baseParams, setBaseParams)}
        {renderParams("Compare Strategy", compareParams, setCompareParams)}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="h-9 w-24 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg uppercase"
            placeholder="Symbol"
          />
          <Segmented size="sm" options={INTERVALS} value={interval} onChange={(v) => setIntervalState(v as Interval)} />
        </div>
        <Button onClick={run} disabled={isPending}>
          {isPending ? <SpinnerGap size={15} className="animate-spin" /> : <Play size={15} weight="fill" />}
          Run Dual Validation
        </Button>
      </div>

      {error && <div className="text-negative text-sm">{error}</div>}

      {baseReport && compareReport && (
        <Card className="p-6 space-y-8">
          <div className="grid grid-cols-3 text-center items-center gap-4 border-b border-line pb-6">
            <div>
              <h4 className="text-lg font-bold text-fg">Base</h4>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Diff</h4>
            </div>
            <div>
              <h4 className="text-lg font-bold text-fg">Compare</h4>
            </div>
          </div>

          <DiffRow 
            label="Edge Score" 
            base={baseReport.edge.score} 
            compare={compareReport.edge.score} 
            formatter={(v) => v.toFixed(0)} 
          />
          <DiffRow 
            label="Win Rate" 
            base={baseReport.full.winRate} 
            compare={compareReport.full.winRate} 
            formatter={(v) => `${v.toFixed(1)}%`} 
          />
          <DiffRow 
            label="Survivability" 
            base={100 - baseReport.monteCarlo.riskOfRuin} 
            compare={100 - compareReport.monteCarlo.riskOfRuin} 
            formatter={(v) => `${v.toFixed(1)}%`} 
          />
          <DiffRow 
            label="Expectancy (OOS)" 
            base={baseReport.walkForward.outOfSample.expectancyR} 
            compare={compareReport.walkForward.outOfSample.expectancyR} 
            formatter={(v) => `${v.toFixed(2)}R`} 
            higherIsBetter={true}
          />
          
          <div className="pt-6">
            <h4 className="text-sm font-semibold text-fg mb-4">Synchronized Out-Of-Sample Equity Curves</h4>
            <SynchronizedChart baseVals={baseReport.walkForward.outOfSample.series.map(s => s.equity)} compareVals={compareReport.walkForward.outOfSample.series.map(s => s.equity)} />
          </div>
        </Card>
      )}
    </div>
  );
}

function DiffRow({ label, base, compare, formatter, higherIsBetter = true }: { label: string, base: number, compare: number, formatter: (v: number) => string, higherIsBetter?: boolean }) {
  const diff = compare - base;
  const isPositive = diff > 0;
  const isNegative = diff < 0;
  
  return (
    <div className="grid grid-cols-3 items-center text-center gap-4">
      <div className="tnum text-lg font-semibold text-fg">{formatter(base)}</div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-faint mb-1">{label}</div>
        <Badge tone={isPositive && higherIsBetter || isNegative && !higherIsBetter ? "positive" : isPositive && !higherIsBetter || isNegative && higherIsBetter ? "negative" : "neutral"} className="mx-auto">
          {diff > 0 ? "+" : ""}{formatter(diff)}
        </Badge>
      </div>
      <div className="tnum text-lg font-semibold text-fg">{formatter(compare)}</div>
    </div>
  );
}

function SynchronizedChart({ baseVals, compareVals }: { baseVals: number[], compareVals: number[] }) {
  const CW = 800;
  const CH = 250;
  const all = [...baseVals, ...compareVals];
  const min = Math.min(...all, 10000);
  const max = Math.max(...all, 10000);
  
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

  return (
    <div>
      <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Synchronized Out-Of-Sample Equity Curves">
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p} x1="0" y1={CH * p} x2={CW} y2={CH * p} stroke="var(--color-line)" strokeWidth="1" />
        ))}
        <path d={linePath(baseVals, min, max)} fill="none" stroke="var(--color-fg-muted)" strokeWidth="2" strokeDasharray="4 4" />
        <path d={linePath(compareVals, min, max)} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      </svg>
      <div className="mt-4 flex justify-center gap-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-4 h-0.5 bg-fg-muted border-t border-dashed border-fg-muted" /> Base
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-4 h-0.5 bg-accent" /> Compare
        </div>
      </div>
    </div>
  );
}
