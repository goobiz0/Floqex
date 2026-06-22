"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useMemo } from "react";

/**
 * Hero equity curve. Draws the real demo equity series when provided, otherwise
 * a representative illustrative path. The line traces itself on mount.
 */

// Fallback illustrative path (one realistic drawdown), in a 0..600 x 0..300 box.
const FALLBACK: ReadonlyArray<readonly [number, number]> = [
  [0, 250], [48, 238], [96, 244], [150, 212], [205, 222], [255, 188], [300, 196],
  [350, 150], [405, 168], [455, 120], [505, 96], [552, 70], [600, 44],
];

const W = 600;
const H = 300;

function toPoints(values: number[]): ReadonlyArray<readonly [number, number]> {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - 12 - ((v - min) / span) * (H - 44);
    return [x, y] as const;
  });
}

export function EquityChart({ values }: { values?: number[] }) {
  const reduce = useReducedMotion();
  const gradId = useId();
  const lineGradId = useId();

  const { linePath, areaPath, last } = useMemo(() => {
    const pts = values && values.length >= 2 ? toPoints(values) : FALLBACK;
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
    return { linePath: line, areaPath: `${line} L${W},${H} L0,${H} Z`, last: pts[pts.length - 1] };
  }, [values]);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Account equity curve trending upward"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-profit)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-profit)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-profit)" />
          </linearGradient>
        </defs>

        {[75, 150, 225].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="var(--color-line)" strokeWidth="1" />
        ))}

        <motion.path
          d={areaPath}
          fill={`url(#${gradId})`}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke={`url(#${lineGradId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.23, 1, 0.32, 1] }}
        />
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r="4.5"
          fill="var(--color-profit)"
          initial={reduce ? false : { opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 1.3 }}
        />
      </svg>
    </div>
  );
}
