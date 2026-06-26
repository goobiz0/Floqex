"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { positionSize, riskReward, stopTargetFromAtr, type Direction } from "@/lib/calculators";
import type { CalcProps } from "./registry";
import {
  BarMeter,
  CalcGrid,
  CalcNote,
  ChoiceField,
  FieldGroup,
  NumberField,
  PriceLadder,
  ResultHero,
  Stat,
  StatGrid,
  fmtNum,
  fmtPct,
  fmtUSD,
  fmtUSD0,
  fmtX,
} from "./shared";

const DIRECTIONS = [
  { value: "LONG" as const, label: "Long" },
  { value: "SHORT" as const, label: "Short" },
];

// ------------------------------------------------------------
// Position size
// ------------------------------------------------------------

export function PositionSizeCalc({ defaultBalance }: CalcProps) {
  const [balance, setBalance] = useState(defaultBalance);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(96);
  const [mult, setMult] = useState(1);

  const r = useMemo(
    () => positionSize({ balance, riskPct, entry, stop, contractMultiplier: mult }),
    [balance, riskPct, entry, stop, mult],
  );

  return (
    <CalcGrid
      inputs={
        <>
          <FieldGroup title="Account">
            <NumberField label="Account equity" value={balance} min={0} onChange={setBalance} unit="$" hint="Pre-filled from your active account when available." />
            <NumberField label="Risk per trade" value={riskPct} min={0} max={100} onChange={setRiskPct} unit="%" hint="Most desks cap this at 0.5 to 2 percent." />
          </FieldGroup>
          <FieldGroup title="Trade levels">
            <NumberField label="Entry price" value={entry} min={0} onChange={setEntry} />
            <NumberField label="Stop price" value={stop} min={0} onChange={setStop} />
            <NumberField label="Contract multiplier" value={mult} min={0} onChange={setMult} hint="Point value per unit. Use 1 for spot or crypto." />
          </FieldGroup>
        </>
      }
      output={
        <>
          <ResultHero
            label="Position size"
            value={`${fmtNum(r.rawUnits, r.rawUnits < 10 ? 4 : 2)} units`}
            sub={<span>{r.units.toLocaleString()} whole {r.units === 1 ? "unit" : "units"} tradable</span>}
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-fg-subtle">
              <span>Capital at risk</span>
              <span className="tnum text-fg-muted">{fmtUSD(r.riskAmount)} ({fmtPct(riskPct)})</span>
            </div>
            <BarMeter fill={riskPct / 100} tone="negative" />
          </div>
          <StatGrid>
            <Stat label="Risk amount" value={fmtUSD(r.riskAmount)} tone="negative" />
            <Stat label="Stop distance" value={fmtNum(r.stopDistance, 2)} hint="entry to stop" />
            <Stat label="Risk / unit" value={fmtUSD(r.riskPerUnit)} />
            <Stat label="Notional" value={fmtUSD0(r.notional)} />
            <Stat label="Effective leverage" value={fmtX(r.leverage)} tone={r.leverage > 5 ? "warning" : "neutral"} />
            <Stat label="Units (raw)" value={fmtNum(r.rawUnits, 3)} />
          </StatGrid>
          <CalcNote>
            Size is set so a full stop-out costs exactly your risk amount. Whole-unit markets round down, so realised risk can be slightly under target.
          </CalcNote>
        </>
      }
    />
  );
}

// ------------------------------------------------------------
// Risk / reward
// ------------------------------------------------------------

export function RiskRewardCalc(_props: CalcProps) {
  const [direction, setDirection] = useState<Direction>("LONG");
  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(96);
  const [target, setTarget] = useState(112);

  const r = useMemo(() => riskReward({ entry, stop, target, direction }), [entry, stop, target, direction]);

  return (
    <CalcGrid
      inputs={
        <>
          <ChoiceField label="Direction" value={direction} onChange={setDirection} options={DIRECTIONS} />
          <FieldGroup title="Trade levels">
            <NumberField label="Entry price" value={entry} min={0} onChange={setEntry} />
            <NumberField label="Stop price" value={stop} min={0} onChange={setStop} />
            <NumberField label="Target price" value={target} min={0} onChange={setTarget} />
          </FieldGroup>
        </>
      }
      output={
        <>
          <ResultHero
            label="Reward to risk"
            value={fmtX(r.ratio)}
            tone={r.ratio >= 1 ? "accent" : "warning"}
            sub={
              <span className="inline-flex items-center gap-2">
                Break-even win rate {fmtPct(r.breakevenWinRate)}
                {r.valid ? (
                  <Badge tone="positive">Valid setup</Badge>
                ) : (
                  <Badge tone="warning">Levels look off</Badge>
                )}
              </span>
            }
          />
          <PriceLadder entry={entry} stop={stop} target={target} direction={direction} />
          <StatGrid cols={3}>
            <Stat label="Risk" value={fmtNum(r.risk, 2)} tone="negative" hint="entry to stop" />
            <Stat label="Reward" value={fmtNum(r.reward, 2)} tone="positive" hint="entry to target" />
            <Stat label="B/E win rate" value={fmtPct(r.breakevenWinRate)} />
          </StatGrid>
          <CalcNote>
            Above the break-even win rate, the trade has positive expectancy. A 2 to 1 payoff only needs to win about a third of the time to profit.
          </CalcNote>
        </>
      }
    />
  );
}

// ------------------------------------------------------------
// ATR stop & target
// ------------------------------------------------------------

export function AtrStopTargetCalc(_props: CalcProps) {
  const [direction, setDirection] = useState<Direction>("LONG");
  const [entry, setEntry] = useState(100);
  const [atr, setAtr] = useState(2.5);
  const [atrMult, setAtrMult] = useState(1.5);
  const [rr, setRr] = useState(2);

  const r = useMemo(
    () => stopTargetFromAtr({ entry, atr, atrMultiple: atrMult, rr, direction }),
    [entry, atr, atrMult, rr, direction],
  );

  return (
    <CalcGrid
      inputs={
        <>
          <ChoiceField label="Direction" value={direction} onChange={setDirection} options={DIRECTIONS} />
          <FieldGroup title="Volatility">
            <NumberField label="Entry price" value={entry} min={0} onChange={setEntry} />
            <NumberField label="ATR (price)" value={atr} min={0} onChange={setAtr} hint="Average True Range of the instrument, in price terms." />
            <NumberField label="Stop multiple" value={atrMult} min={0} onChange={setAtrMult} unit="x ATR" hint="Distance of the stop from entry, in ATRs." />
            <NumberField label="Reward to risk" value={rr} min={0} onChange={setRr} unit="R" />
          </FieldGroup>
        </>
      }
      output={
        <>
          <div className="grid grid-cols-2 gap-3">
            <ResultHero label="Stop price" value={fmtNum(r.stop, 2)} tone="negative" />
            <ResultHero label="Target price" value={fmtNum(r.target, 2)} tone="positive" />
          </div>
          <PriceLadder entry={entry} stop={r.stop} target={r.target} direction={direction} />
          <StatGrid>
            <Stat label="Stop distance" value={fmtNum(r.stopDistance, 2)} hint={`${fmtX(atrMult, 1)} ATR`} />
            <Stat label="Target distance" value={fmtNum(r.targetDistance, 2)} hint={`${fmtX(rr, 1)} risk`} />
          </StatGrid>
          <CalcNote>
            Volatility-scaled exits keep your stop outside normal noise. Wider ATRs need wider stops, which means a smaller position for the same dollar risk.
          </CalcNote>
        </>
      }
    />
  );
}
