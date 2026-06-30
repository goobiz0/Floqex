"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CopyPnlPoint } from "@/lib/queries";

/**
 * Draw-on cumulative P&L sparkline for the copy-trading hero. The trend is P&L,
 * so it uses the profit / negative tokens (never the brand accent), per the
 * design system. Motion is a single motivated draw-on, reduced-motion safe.
 */
export function CopyEquitySparkline({
  data,
  className,
  height = 56,
}: {
  data: CopyPnlPoint[];
  className?: string;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const W = 100;
  const H = 36;
  const PAD = 3;

  const { line, area, up, lastX, lastY, hasMove } = useMemo(() => {
    const values = data.map((d) => d.cumulative);
    const n = values.length;
    if (n === 0) {
      return { line: "", area: "", up: true, lastX: W, lastY: H / 2, hasMove: false };
    }
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 0);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    const x = (i: number) => (n === 1 ? W : PAD + (i / (n - 1)) * (W - PAD * 2));
    const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

    const pts = values.map((v, i) => [x(i), y(v)] as const);
    const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`).join(" ");
    const area = `${line} L ${pts[n - 1][0].toFixed(2)} ${H} L ${pts[0][0].toFixed(2)} ${H} Z`;
    const last = values[n - 1];
    return {
      line,
      area,
      up: last >= 0,
      lastX: pts[n - 1][0],
      lastY: pts[n - 1][1],
      hasMove: values.some((v) => v !== 0),
    };
  }, [data]);

  const stroke = up ? "var(--color-profit)" : "var(--color-negative)";
  const gradId = up ? "copy-spark-up" : "copy-spark-down";

  if (!line) return <div className={className} style={{ height }} aria-hidden />;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      style={{ height, width: "100%" }}
      role="img"
      aria-label="Cumulative copied profit and loss over the last 14 days"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {hasMove && <path d={area} fill={`url(#${gradId})`} stroke="none" />}
      <motion.path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      />
      {hasMove && (
        <circle cx={lastX} cy={lastY} r={1.8} fill={stroke} vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}
