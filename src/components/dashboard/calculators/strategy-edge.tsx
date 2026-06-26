"use client";

import { useMemo, useState } from "react";
import { expectancy, kelly, requiredWinRate } from "@/lib/calculators";
import type { CalcProps } from "./registry";
import {
  BarMeter,
  CalcGrid,
  CalcNote,
  CurveChart,
  FieldGroup,
  NumberField,
  ResultHero,
  Stat,
  StatGrid,
  fmtNum,
  fmtPct,
  fmtUSD,
  fmtUSD0,
  fmtX,
} from "./shared";

// ------------------------------------------------------------
// Kelly criterion
// ------------------------------------------------------------

export function KellyCalc(_props: CalcProps) {
  const [winRate, setWinRate] = useState(55);
  const [payoff, setPayoff] = useState(1.6);

  const r = useMemo(() => kelly(winRate, payoff), [winRate, payoff]);
  const hasEdge = r.fraction > 0;

  return (
    <CalcGrid
      inputs={
        <FieldGroup title="Edge">
          <NumberField label="Win rate" value={winRate} min={0} max={100} onChange={setWinRate} unit="%" />
          <NumberField label="Reward to risk" value={payoff} min={0} onChange={setPayoff} unit="R" hint="Average win divided by average loss." />
        </FieldGroup>
      }
      output={
        <>
          <ResultHero
            label="Full Kelly stake"
            value={fmtPct(r.fraction * 100)}
            tone={hasEdge ? "accent" : "warning"}
            sub={hasEdge ? <span>of capital per trade for max long-run growth</span> : <span>No edge at these inputs, do not size up</span>}
          />
          {hasEdge ? (
            <CurveChart
              points={r.curve.map((c) => ({ x: c.fraction, y: c.growth }))}
              markerX={r.fraction}
              format={(n) => fmtPct(n * 100, 0)}
              xLabel="Fraction of capital risked"
              yLabelLeft="Growth rate"
            />
          ) : null}
          <StatGrid cols={3}>
            <Stat label="Half Kelly" value={fmtPct(r.halfKelly * 100)} tone="accent" hint="recommended" />
            <Stat label="Quarter Kelly" value={fmtPct(r.quarterKelly * 100)} hint="conservative" />
            <Stat label="Growth / trade" value={fmtPct(r.growthRate * 100, 2)} tone={r.growthRate > 0 ? "positive" : "negative"} />
          </StatGrid>
          <CalcNote>
            Full Kelly maximises growth but is brutally volatile. Most professionals trade half or quarter Kelly to cut drawdowns while keeping most of the growth.
          </CalcNote>
        </>
      }
    />
  );
}

// ------------------------------------------------------------
// Expectancy
// ------------------------------------------------------------

export function ExpectancyCalc(_props: CalcProps) {
  const [winRate, setWinRate] = useState(45);
  const [avgWin, setAvgWin] = useState(320);
  const [avgLoss, setAvgLoss] = useState(150);

  const r = useMemo(() => expectancy(winRate, avgWin, avgLoss), [winRate, avgWin, avgLoss]);
  const tone = r.perTrade >= 0 ? "positive" : "negative";
  const scale = Math.max(avgWin, avgLoss, 1);
  const per100 = r.perTrade * 100;

  return (
    <CalcGrid
      inputs={
        <FieldGroup title="Trade stats">
          <NumberField label="Win rate" value={winRate} min={0} max={100} onChange={setWinRate} unit="%" />
          <NumberField label="Average win" value={avgWin} min={0} onChange={setAvgWin} unit="$" />
          <NumberField label="Average loss" value={avgLoss} min={0} onChange={setAvgLoss} unit="$" />
        </FieldGroup>
      }
      output={
        <>
          <ResultHero
            label="Expectancy per trade"
            value={fmtUSD(r.perTrade)}
            tone={tone}
            sub={<span>{fmtUSD0(per100)} expected over the next 100 trades</span>}
          />
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-fg-subtle">
                <span>Average win</span>
                <span className="tnum text-profit">{fmtUSD(avgWin)}</span>
              </div>
              <BarMeter fill={avgWin / scale} tone="profit" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-fg-subtle">
                <span>Average loss</span>
                <span className="tnum text-negative">{fmtUSD(avgLoss)}</span>
              </div>
              <BarMeter fill={avgLoss / scale} tone="negative" />
            </div>
          </div>
          <StatGrid cols={3}>
            <Stat label="Per R" value={`${fmtNum(r.perR, 2)}R`} tone={tone} />
            <Stat label="Profit factor" value={Number.isFinite(r.profitFactor) ? fmtNum(r.profitFactor, 2) : "∞"} tone={r.profitFactor >= 1 ? "positive" : "negative"} />
            <Stat label="Edge" value={fmtPct(r.edgePct, 1, true)} tone={tone} />
          </StatGrid>
          <CalcNote>
            A positive expectancy means the system makes money over enough trades, even with a sub-50 percent win rate. Profit factor above 1 confirms wins outweigh losses.
          </CalcNote>
        </>
      }
    />
  );
}

// ------------------------------------------------------------
// Required win rate
// ------------------------------------------------------------

export function RequiredWinRateCalc(_props: CalcProps) {
  const [rr, setRr] = useState(2);

  const breakevenAt = useMemo(() => requiredWinRate(rr), [rr]);
  const curve = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 48; i++) {
      const x = 0.25 + (i / 48) * (5 - 0.25);
      pts.push({ x, y: requiredWinRate(x) });
    }
    return pts;
  }, []);

  const reference = [1, 1.5, 2, 3].map((v) => ({ rr: v, wr: requiredWinRate(v) }));

  return (
    <CalcGrid
      inputs={
        <FieldGroup title="Payoff">
          <NumberField label="Reward to risk" value={rr} min={0.1} max={10} onChange={setRr} unit="R" hint="How many times your risk you make on a win." />
        </FieldGroup>
      }
      output={
        <>
          <ResultHero
            label={`Break-even win rate at ${fmtX(rr, 1)}`}
            value={fmtPct(breakevenAt)}
            sub={<span>Win more than this and the edge turns positive</span>}
          />
          <CurveChart
            points={curve}
            markerX={rr}
            format={(n) => `${fmtNum(n, 1)}R`}
            xLabel="Reward to risk"
            yLabelLeft="Win rate needed"
          />
          <StatGrid>
            {reference.map((row) => (
              <Stat key={row.rr} label={`At ${fmtX(row.rr, row.rr % 1 === 0 ? 0 : 1)}`} value={fmtPct(row.wr)} tone={row.rr === rr ? "accent" : "neutral"} />
            ))}
          </StatGrid>
          <CalcNote>
            Bigger winners need fewer wins. This is why trend systems survive on a 35 percent hit rate, while scalpers chasing 1 to 1 need to be right more than half the time.
          </CalcNote>
        </>
      }
    />
  );
}
