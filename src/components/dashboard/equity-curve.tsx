"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatUSD } from "@/lib/utils";
import { Segmented } from "@/components/ui/segmented";
import type { EquityPoint } from "@/lib/metrics";

const TIMEFRAMES = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const DAYS: Record<Timeframe, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: Number.POSITIVE_INFINITY,
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

export function EquityCurve({ series }: { series: EquityPoint[] }) {
  const [tf, setTf] = useState<Timeframe>("3M");
  const reduce = useReducedMotion();

  const data = useMemo(() => {
    const n = DAYS[tf];
    const sliced =
      n === Number.POSITIVE_INFINITY ? series : series.slice(-Math.min(series.length, n));
    const values = sliced.map((p) => p.equity);
    if (values.length < 2) return null;
    return buildPaths(values);
  }, [series, tf]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Segmented
          size="sm"
          options={TIMEFRAMES.map((t) => ({ value: t, label: t }))}
          value={tf}
          onChange={setTf}
        />
        {data ? <span className="tnum text-xs text-fg-subtle">{formatUSD(data.last)}</span> : null}
      </div>

      {data ? (
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
                <stop offset="0%" stopColor="var(--color-profit)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-profit)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((p) => (
              <line
                key={p}
                x1="0"
                y1={H * p}
                x2={W}
                y2={H * p}
                stroke="var(--color-line)"
                strokeWidth="1"
              />
            ))}
            <motion.path
              key={`${tf}-area`}
              d={data.area}
              fill="url(#eqFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
            <motion.path
              key={`${tf}-line`}
              d={data.line}
              fill="none"
              stroke="var(--color-profit)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            />
          </svg>
          <div className="pointer-events-none absolute right-0 top-0 flex h-full flex-col justify-between py-1 text-right">
            <span className="tnum text-[0.65rem] text-fg-faint">{formatUSD(data.max)}</span>
            <span className="tnum text-[0.65rem] text-fg-faint">{formatUSD(data.min)}</span>
          </div>
        </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-center text-sm text-fg-subtle">
          No equity history yet. Your curve appears once the bot logs its first session.
        </div>
      )}
    </div>
  );
}
