"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { compounding, drawdownRecovery, monteCarlo } from "@/lib/calculators";
import type { CalcProps } from "./registry";
import {
  BarMeter,
  CalcGrid,
  CalcNote,
  ChoiceField,
  DistributionChart,
  EquityPaths,
  FieldGroup,
  NumberField,
  ResultHero,
  Stat,
  StatGrid,
  fmtCompact,
  fmtNum,
  fmtPct,
  fmtUSD0,
} from "./shared";

// ------------------------------------------------------------
// Monte Carlo simulation
// ------------------------------------------------------------

export function MonteCarloCalc({ defaultBalance }: CalcProps) {
  const [start, setStart] = useState(defaultBalance);
  const [riskPct, setRiskPct] = useState(1);
  const [winRate, setWinRate] = useState(52);
  const [rr, setRr] = useState(1.6);
  const [trades, setTrades] = useState(200);
  const [sims, setSims] = useState(500);
  const [ruinPct, setRuinPct] = useState(40);
  const [seed, setSeed] = useState(1);

  const r = useMemo(
    () => monteCarlo({ start, riskPct, winRate, rr, trades, sims, ruinPct, seed }),
    [start, riskPct, winRate, rr, trades, sims, ruinPct, seed],
  );

  const medianTone = r.median >= start ? "positive" : "negative";

  return (
    <CalcGrid
      inputs={
        <>
          <FieldGroup title="Account & edge">
            <NumberField label="Starting balance" value={start} min={1} onChange={setStart} unit="$" />
            <NumberField label="Risk per trade" value={riskPct} min={0} max={100} onChange={setRiskPct} unit="%" hint="Fraction of current equity, so wins and losses compound." />
            <NumberField label="Win rate" value={winRate} min={0} max={100} onChange={setWinRate} unit="%" />
            <NumberField label="Reward to risk" value={rr} min={0} onChange={setRr} unit="R" />
          </FieldGroup>
          <FieldGroup title="Simulation">
            <NumberField label="Trades per run" value={trades} min={1} max={1000} onChange={setTrades} />
            <NumberField label="Simulated runs" value={sims} min={1} max={2000} onChange={setSims} hint="More runs sharpen the distribution. Up to 2000." />
            <NumberField label="Ruin threshold" value={ruinPct} min={1} max={100} onChange={setRuinPct} unit="%" hint="Drawdown from peak that counts as account ruin." />
          </FieldGroup>
          <Button variant="secondary" size="sm" onClick={() => setSeed((s) => s + 1)} className="w-full">
            <ArrowsClockwise size={15} weight="bold" /> Re-run with a new seed
          </Button>
        </>
      }
      output={
        <>
          <ResultHero
            label="Median outcome"
            value={fmtUSD0(r.median)}
            tone={medianTone}
            sub={
              <span>
                {fmtPct(r.probProfit)} of runs end in profit · {fmtNum((r.median / start - 1) * 100, 1)}% median return
              </span>
            }
          />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">Equity paths ({r.samplePaths.length} of {sims} shown)</p>
            <EquityPaths paths={r.samplePaths} baseline={start} height={220} />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">Final balance distribution</p>
            <DistributionChart bins={r.histogram} baseline={start} format={fmtCompact} />
          </div>

          <StatGrid cols={3}>
            <Stat label="5th pct" value={fmtUSD0(r.p5)} tone="negative" hint="unlucky" />
            <Stat label="Median" value={fmtUSD0(r.median)} tone={medianTone} />
            <Stat label="95th pct" value={fmtUSD0(r.p95)} tone="positive" hint="lucky" />
            <Stat label="Prob. of profit" value={fmtPct(r.probProfit)} tone={r.probProfit >= 50 ? "positive" : "negative"} />
            <Stat label="Risk of ruin" value={fmtPct(r.riskOfRuin)} tone={r.riskOfRuin > 10 ? "negative" : "neutral"} hint={`>${ruinPct}% drawdown`} />
            <Stat label="Median max DD" value={fmtPct(r.medianMaxDrawdown)} tone="warning" />
          </StatGrid>

          <CalcNote>
            A stochastic estimate, not a forecast. It assumes trades are independent and your edge holds steady. Notice how raising risk per trade widens the range and lifts risk of ruin far faster than it lifts the median.
          </CalcNote>
        </>
      }
    />
  );
}

// ------------------------------------------------------------
// Compounding projection
// ------------------------------------------------------------

const PERIODS = [
  { value: "Daily" as const, label: "Daily" },
  { value: "Weekly" as const, label: "Weekly" },
  { value: "Monthly" as const, label: "Monthly" },
];
type PeriodLabel = (typeof PERIODS)[number]["value"];

export function CompoundingCalc({ defaultBalance }: CalcProps) {
  const [start, setStart] = useState(defaultBalance);
  const [ratePct, setRatePct] = useState(3);
  const [periods, setPeriods] = useState(24);
  const [contribution, setContribution] = useState(0);
  const [period, setPeriod] = useState<PeriodLabel>("Monthly");

  const r = useMemo(
    () => compounding({ start, ratePct, periods, contribution }),
    [start, ratePct, periods, contribution],
  );

  const growthTone = r.totalGrowth >= 0 ? "positive" : "negative";

  return (
    <CalcGrid
      inputs={
        <>
          <ChoiceField label="Period" value={period} onChange={setPeriod} options={PERIODS} />
          <FieldGroup title="Plan">
            <NumberField label="Starting balance" value={start} min={0} onChange={setStart} unit="$" />
            <NumberField label="Return per period" value={ratePct} min={-100} max={100} onChange={setRatePct} unit="%" allowNegative />
            <NumberField label={`Number of ${period.toLowerCase()} periods`} value={periods} min={0} max={600} onChange={setPeriods} />
            <NumberField label="Added each period" value={contribution} min={0} onChange={setContribution} unit="$" hint="Optional recurring top-up." />
          </FieldGroup>
        </>
      }
      output={
        <>
          <ResultHero
            label="Projected balance"
            value={fmtUSD0(r.finalBalance)}
            tone={growthTone}
            sub={<span>{fmtUSD0(r.totalGrowth)} of growth on {fmtUSD0(r.totalContributed)} put in</span>}
          />
          <EquityPaths paths={[]} highlight={r.series} baseline={start} height={220} />
          <StatGrid cols={3}>
            <Stat label="Contributed" value={fmtUSD0(r.totalContributed)} />
            <Stat label="Growth" value={fmtUSD0(r.totalGrowth)} tone={growthTone} />
            <Stat label="Multiple" value={`${fmtNum(start > 0 ? r.finalBalance / start : 0, 2)}x`} tone="accent" />
          </StatGrid>
          <CalcNote>
            Compounding rewards consistency over heroics. A steady {fmtPct(ratePct)} per period turns small, repeatable edges into outsized results given enough time. Returns are never this smooth in reality.
          </CalcNote>
        </>
      }
    />
  );
}

// ------------------------------------------------------------
// Drawdown recovery
// ------------------------------------------------------------

export function DrawdownRecoveryCalc(_props: CalcProps) {
  const [dd, setDd] = useState(20);

  const recovery = useMemo(() => drawdownRecovery(dd), [dd]);
  const reference = [10, 20, 30, 50].map((v) => ({ dd: v, gain: drawdownRecovery(v) }));
  const recoveryScale = Math.max(100, recovery);

  return (
    <CalcGrid
      inputs={
        <FieldGroup title="Drawdown">
          <NumberField label="Drawdown from peak" value={dd} min={0} max={99} onChange={setDd} unit="%" hint="How far equity has fallen from its high-water mark." />
        </FieldGroup>
      }
      output={
        <>
          <ResultHero
            label="Gain required to recover"
            value={fmtPct(recovery)}
            tone="warning"
            sub={<span>needed just to get back to break even</span>}
          />
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-fg-subtle">
                <span>Drawdown</span>
                <span className="tnum text-negative">-{fmtPct(dd)}</span>
              </div>
              <BarMeter fill={dd / 100} tone="negative" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-fg-subtle">
                <span>Recovery gain</span>
                <span className="tnum text-profit">+{fmtPct(recovery)}</span>
              </div>
              <BarMeter fill={recovery / recoveryScale} tone="profit" />
            </div>
          </div>
          <StatGrid>
            {reference.map((row) => (
              <Stat key={row.dd} label={`Down ${row.dd}%`} value={`+${fmtPct(row.gain)}`} tone={row.dd === dd ? "accent" : "neutral"} />
            ))}
          </StatGrid>
          <CalcNote>
            Losses and the gains needed to undo them are asymmetric, and the gap explodes past 30 percent. This is the whole case for hard daily-loss limits and tight risk per trade.
          </CalcNote>
        </>
      }
    />
  );
}
