"use client";

import { useMemo, useState } from "react";
import { breakeven, leverageMargin, profitLoss, type Direction } from "@/lib/calculators";
import type { CalcProps } from "./registry";
import {
  BarMeter,
  CalcGrid,
  CalcNote,
  ChoiceField,
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

const DIRECTIONS = [
  { value: "LONG" as const, label: "Long" },
  { value: "SHORT" as const, label: "Short" },
];

// ------------------------------------------------------------
// Leverage & margin
// ------------------------------------------------------------

export function LeverageCalc({ defaultBalance }: CalcProps) {
  const [equity, setEquity] = useState(defaultBalance);
  const [entry, setEntry] = useState(100);
  const [units, setUnits] = useState(50);
  const [leverage, setLeverage] = useState(10);
  const [mm, setMm] = useState(0.5);
  const [direction, setDirection] = useState<Direction>("LONG");

  const r = useMemo(
    () => leverageMargin({ equity, entry, units, leverage, maintenanceMarginPct: mm, direction }),
    [equity, entry, units, leverage, mm, direction],
  );

  const marginUse = equity > 0 ? r.marginRequired / equity : 0;

  return (
    <CalcGrid
      inputs={
        <>
          <ChoiceField label="Direction" value={direction} onChange={setDirection} options={DIRECTIONS} />
          <FieldGroup title="Position">
            <NumberField label="Account equity" value={equity} min={0} onChange={setEquity} unit="$" />
            <NumberField label="Entry price" value={entry} min={0} onChange={setEntry} />
            <NumberField label="Position size" value={units} min={0} onChange={setUnits} unit="units" />
          </FieldGroup>
          <FieldGroup title="Broker terms">
            <NumberField label="Leverage" value={leverage} min={1} max={500} onChange={setLeverage} unit="x" />
            <NumberField label="Maintenance margin" value={mm} min={0} max={100} onChange={setMm} unit="%" hint="Equity floor before liquidation, as a percent of notional." />
          </FieldGroup>
        </>
      }
      output={
        <>
          <ResultHero
            label="Margin required"
            value={fmtUSD0(r.marginRequired)}
            sub={<span>{fmtUSD0(r.notional)} notional at {fmtX(leverage, 0)}</span>}
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-fg-subtle">
              <span>Margin used of equity</span>
              <span className="tnum text-fg-muted">{fmtPct(marginUse * 100)}</span>
            </div>
            <BarMeter fill={marginUse} tone={marginUse > 0.5 ? "warning" : "accent"} />
          </div>
          <StatGrid>
            <Stat label="Liquidation price" value={fmtNum(r.liquidationPrice, 2)} tone="negative" />
            <Stat label="Distance to liq." value={fmtPct(r.liquidationDistancePct)} tone={r.liquidationDistancePct < 5 ? "negative" : "neutral"} />
            <Stat label="Notional" value={fmtUSD0(r.notional)} />
            <Stat label="Free equity" value={fmtUSD0(Math.max(0, equity - r.marginRequired))} />
          </StatGrid>
          <CalcNote>
            Liquidation is an approximation using the initial margin as the loss buffer. Funding, fees and gaps can trigger it sooner. Keep a buffer.
          </CalcNote>
        </>
      }
    />
  );
}

// ------------------------------------------------------------
// Profit & loss
// ------------------------------------------------------------

export function ProfitLossCalc(_props: CalcProps) {
  const [direction, setDirection] = useState<Direction>("LONG");
  const [entry, setEntry] = useState(100);
  const [exit, setExit] = useState(108);
  const [units, setUnits] = useState(50);
  const [stop, setStop] = useState(96);
  const [feePct, setFeePct] = useState(0.05);

  const r = useMemo(
    () => profitLoss({ entry, exit, units, direction, feePct, stop }),
    [entry, exit, units, direction, feePct, stop],
  );

  const tone = r.netPnl >= 0 ? "positive" : "negative";

  return (
    <CalcGrid
      inputs={
        <>
          <ChoiceField label="Direction" value={direction} onChange={setDirection} options={DIRECTIONS} />
          <FieldGroup title="Fills">
            <NumberField label="Entry price" value={entry} min={0} onChange={setEntry} />
            <NumberField label="Exit price" value={exit} min={0} onChange={setExit} />
            <NumberField label="Position size" value={units} min={0} onChange={setUnits} unit="units" />
          </FieldGroup>
          <FieldGroup title="Optional">
            <NumberField label="Stop price" value={stop} min={0} onChange={setStop} hint="Used to express the result in R multiples." />
            <NumberField label="Fee per side" value={feePct} min={0} max={5} onChange={setFeePct} unit="%" />
          </FieldGroup>
        </>
      }
      output={
        <>
          <ResultHero
            label="Net profit / loss"
            value={fmtUSD(r.netPnl)}
            tone={tone}
            sub={<span>Return on notional {fmtPct(r.returnPct, 2, true)}{r.rMultiple != null ? ` · ${fmtNum(r.rMultiple, 2)}R` : ""}</span>}
          />
          <StatGrid>
            <Stat label="Gross P&L" value={fmtUSD(r.grossPnl)} tone={r.grossPnl >= 0 ? "positive" : "negative"} />
            <Stat label="Fees" value={fmtUSD(r.fees)} tone="negative" />
            <Stat label="Return" value={fmtPct(r.returnPct, 2, true)} tone={tone} />
            <Stat label="R multiple" value={r.rMultiple != null ? `${fmtNum(r.rMultiple, 2)}R` : "—"} tone={tone} />
          </StatGrid>
          <CalcNote>
            Fees are charged on both the entry and exit notional. On tight scalps they quietly erode an edge, so always price them in.
          </CalcNote>
        </>
      }
    />
  );
}

// ------------------------------------------------------------
// Breakeven
// ------------------------------------------------------------

export function BreakevenCalc(_props: CalcProps) {
  const [direction, setDirection] = useState<Direction>("LONG");
  const [entry, setEntry] = useState(100);
  const [feePerSide, setFeePerSide] = useState(0.05);
  const [spread, setSpread] = useState(0.02);

  const roundTripPct = feePerSide * 2 + spread;
  const r = useMemo(() => breakeven(entry, roundTripPct, direction), [entry, roundTripPct, direction]);

  return (
    <CalcGrid
      inputs={
        <>
          <ChoiceField label="Direction" value={direction} onChange={setDirection} options={DIRECTIONS} />
          <FieldGroup title="Costs">
            <NumberField label="Entry price" value={entry} min={0} onChange={setEntry} />
            <NumberField label="Fee per side" value={feePerSide} min={0} max={5} onChange={setFeePerSide} unit="%" />
            <NumberField label="Spread / slippage" value={spread} min={0} max={5} onChange={setSpread} unit="%" hint="Round-trip cost beyond commission." />
          </FieldGroup>
        </>
      }
      output={
        <>
          <ResultHero
            label="Break-even price"
            value={fmtNum(r.breakevenPrice, 2)}
            sub={<span>Needs a {fmtPct(r.breakevenPct, 2)} move just to cover costs</span>}
          />
          <StatGrid>
            <Stat label="Round-trip cost" value={fmtPct(roundTripPct, 2)} tone="negative" />
            <Stat label="Move to break even" value={fmtNum(r.breakevenMove, 2)} />
          </StatGrid>
          <CalcNote>
            Every position starts underwater by its transaction cost. The wider your costs, the more your edge has to clear before a trade is truly green.
          </CalcNote>
        </>
      }
    />
  );
}
