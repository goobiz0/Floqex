"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Tone = "profit" | "negative" | "accent" | "auto";

/**
 * Shared sparkline used across dashboard cards. Pure SVG, token-coloured, with
 * an optional area fill. `tone="auto"` colours by the net change (last vs first)
 * so an equity card greens when up and reds when down. Draw-on is motion-safe
 * only, so it respects prefers-reduced-motion.
 */
export function Sparkline({
  values,
  tone = "accent",
  fill = true,
  baseline = false,
  className,
  strokeWidth = 2,
}: {
  values: number[];
  tone?: Tone;
  fill?: boolean;
  baseline?: boolean; // draw a zero line (for signed series like drawdown)
  className?: string;
  strokeWidth?: number;
}) {
  const gradId = useId();
  const W = 300;
  const H = 80;

  if (values.length < 2) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center", className)}>
        <span className="text-[11px] text-fg-subtle">Not enough data yet</span>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stroke =
    tone === "auto"
      ? values[values.length - 1] >= values[0]
        ? "var(--color-profit)"
        : "var(--color-negative)"
      : tone === "profit"
        ? "var(--color-profit)"
        : tone === "negative"
          ? "var(--color-negative)"
          : "var(--color-accent)";

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - 6 - ((v - min) / span) * (H - 12);
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // Zero baseline: top edge for an all-negative series (0 is the max), bottom
  // edge for an all-positive one, interpolated when the series crosses zero.
  const zeroY = max <= 0 ? 6 : min >= 0 ? H - 6 : H - 6 - ((0 - min) / span) * (H - 12);
  // With a baseline, the fill closes to zero (so a drawdown shades the underwater
  // region); otherwise it closes to the chart floor.
  const areaBaseY = baseline ? zeroY : H;
  const area = `${line} L${W},${areaBaseY} L0,${areaBaseY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-full w-full", className)} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.2" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {baseline && (
        <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="3 3" />
      )}
      {fill && <path d={area} fill={`url(#${gradId})`} />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="[stroke-dasharray:1000] [stroke-dashoffset:1000] motion-safe:animate-[sparkdraw_0.6s_ease-out_forwards] motion-reduce:[stroke-dasharray:none] motion-reduce:[stroke-dashoffset:0]"
      />
    </svg>
  );
}
