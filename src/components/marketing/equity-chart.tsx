"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

/**
 * Hero equity curve. A real (illustrative) area chart drawn as SVG, with the
 * line tracing itself on mount. No hard numbers, so it reads as a value-prop
 * visual rather than a fabricated performance claim.
 */

// An upward equity path with one realistic drawdown, in a 0..600 x 0..300 box.
const POINTS = [
  [0, 250],
  [48, 238],
  [96, 244],
  [150, 212],
  [205, 222],
  [255, 188],
  [300, 196],
  [350, 150],
  [405, 168],
  [455, 120],
  [505, 96],
  [552, 70],
  [600, 44],
] as const;

const linePath = POINTS.map(
  ([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`,
).join(" ");
const areaPath = `${linePath} L600,300 L0,300 Z`;

export function EquityChart() {
  const reduce = useReducedMotion();
  const gradId = useId();
  const lineGradId = useId();

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 600 300"
        className="w-full"
        role="img"
        aria-label="Illustrative account equity curve trending upward"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.696 0.17 162)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="oklch(0.696 0.17 162)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.6 0.16 162)" />
            <stop offset="100%" stopColor="oklch(0.78 0.17 162)" />
          </linearGradient>
        </defs>

        {/* baseline gridlines */}
        {[75, 150, 225].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="600"
            y2={y}
            stroke="oklch(0.27 0.006 260 / 0.5)"
            strokeWidth="1"
          />
        ))}

        {/* filled area */}
        <motion.path
          d={areaPath}
          fill={`url(#${gradId})`}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />

        {/* drawn line */}
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

        {/* leading marker */}
        <motion.circle
          cx={600}
          cy={44}
          r="4.5"
          fill="oklch(0.78 0.17 162)"
          initial={reduce ? false : { opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 1.3 }}
        />
      </svg>
    </div>
  );
}
