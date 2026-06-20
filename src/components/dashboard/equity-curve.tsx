"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const COUNTS: Record<Timeframe, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 60,
  "6M": 90,
  "1Y": 120,
  ALL: 160,
};

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic upward random walk so the curve is stable across renders. */
function makeSeries(n: number, seed: number): number[] {
  const rng = mulberry32(seed);
  let v = 10000;
  const out: number[] = [v];
  for (let i = 1; i < n; i++) {
    const drift = 22;
    const noise = (rng() - 0.46) * 180;
    v = Math.max(9400, v + drift + noise);
    out.push(v);
  }
  return out;
}

const SERIES: Record<Timeframe, number[]> = {
  "1W": makeSeries(COUNTS["1W"], 7),
  "1M": makeSeries(COUNTS["1M"], 31),
  "3M": makeSeries(COUNTS["3M"], 90),
  "6M": makeSeries(COUNTS["6M"], 181),
  "1Y": makeSeries(COUNTS["1Y"], 365),
  ALL: makeSeries(COUNTS["ALL"], 999),
};

const W = 800;
const H = 280;

function buildPaths(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((val, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - 16 - ((val - min) / span) * (H - 36);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return { line, area, min, max, last: values[values.length - 1] };
}

export function EquityCurve() {
  const [tf, setTf] = useState<Timeframe>("3M");
  const reduce = useReducedMotion();
  const { line, area, min, max, last } = useMemo(
    () => buildPaths(SERIES[tf]),
    [tf],
  );

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-[var(--radius-control)] border border-line bg-surface p-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={cn(
                "rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors",
                tf === t
                  ? "bg-overlay text-fg"
                  : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="tnum text-xs text-fg-subtle">{fmt(last)}</span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Equity curve over ${tf}`}
        >
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.696 0.17 162)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="oklch(0.696 0.17 162)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1="0"
              y1={H * p}
              x2={W}
              y2={H * p}
              stroke="oklch(0.27 0.006 260 / 0.45)"
              strokeWidth="1"
            />
          ))}
          <motion.path key={`${tf}-area`} d={area} fill="url(#eqFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} />
          <motion.path
            key={`${tf}-line`}
            d={line}
            fill="none"
            stroke="oklch(0.74 0.17 162)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          />
        </svg>
        <div className="pointer-events-none absolute right-0 top-0 flex h-full flex-col justify-between py-1 text-right">
          <span className="tnum text-[0.65rem] text-fg-faint">{fmt(max)}</span>
          <span className="tnum text-[0.65rem] text-fg-faint">{fmt(min)}</span>
        </div>
      </div>
    </div>
  );
}
