"use client";

import { type ReactNode, useId } from "react";
import { ClampedNumberInput } from "@/components/ui/clamped-number-input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { cn, formatUSD } from "@/lib/utils";

// ============================================================
// Formatting
// ============================================================

export const fmtUSD = (n: number): string => formatUSD(Number.isFinite(n) ? n : 0);
export const fmtUSD0 = (n: number): string => fmtUSD(n).replace(".00", "");

/** Compact currency for axis ticks: $12.4k, $1.2M. */
export function fmtCompact(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtNum(n: number, dp = 2): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function fmtPct(n: number, dp = 1, sign = false): string {
  const v = Number.isFinite(n) ? n : 0;
  const s = sign && v > 0 ? "+" : "";
  return `${s}${v.toFixed(dp)}%`;
}

export function fmtX(n: number, dp = 2): string {
  return `${(Number.isFinite(n) ? n : 0).toFixed(dp)}x`;
}

// ============================================================
// Form fields
// ============================================================

/** Label-above number input with optional unit and helper text. */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  hint,
  allowNegative,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: ReactNode;
  hint?: string;
  allowNegative?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <ClampedNumberInput
        id={id}
        value={value}
        min={min}
        max={max}
        onCommit={onChange}
        trailing={unit}
        allowNegative={allowNegative}
        ariaLabel={label}
        className="tnum w-full"
      />
      {hint ? <p className="text-xs leading-relaxed text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

/** Label-above segmented control, used for direction toggles and presets. */
export function ChoiceField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Segmented options={options} value={value} onChange={onChange} className="w-full" />
      {hint ? <p className="text-xs leading-relaxed text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

/** Section heading inside an input column. */
export function FieldGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      {title ? (
        <h4 className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">{title}</h4>
      ) : null}
      {children}
    </div>
  );
}

// ============================================================
// Result display
// ============================================================

type Tone = "neutral" | "positive" | "negative" | "accent" | "warning";

const toneText: Record<Tone, string> = {
  neutral: "text-fg",
  positive: "text-profit",
  negative: "text-negative",
  accent: "text-accent",
  warning: "text-warning",
};

/** The single headline number for a calculator result. */
export function ResultHero({
  label,
  value,
  tone = "accent",
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-base/40 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p className={cn("tnum mt-2 text-3xl font-semibold tracking-tight", toneText[tone])}>{value}</p>
      {sub ? <div className="mt-1.5 text-sm text-fg-muted">{sub}</div> : null}
    </div>
  );
}

/** A secondary result tile. */
export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</dt>
      <dd className={cn("tnum mt-1 text-base font-semibold", toneText[tone])}>{value}</dd>
      {hint ? <p className="mt-0.5 text-[11px] leading-snug text-fg-faint">{hint}</p> : null}
    </div>
  );
}

export function StatGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <dl className={cn("grid gap-2.5", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>{children}</dl>
  );
}

/** Two-column input / output scaffold shared by every calculator. */
export function CalcGrid({ inputs, output }: { inputs: ReactNode; output: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section className="rounded-[var(--radius-card)] border border-line bg-elevated p-5 shadow-[var(--shadow-sm)]">
        <div className="space-y-5">{inputs}</div>
      </section>
      <section className="rounded-[var(--radius-card)] border border-line bg-elevated p-5 shadow-[var(--shadow-sm)]">
        <div className="space-y-4">{output}</div>
      </section>
    </div>
  );
}

/** A small explanatory note, used to flag estimates and assumptions. */
export function CalcNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-control)] border border-line bg-surface/60 px-3 py-2 text-xs leading-relaxed text-fg-subtle">
      {children}
    </p>
  );
}

// ============================================================
// Visuals (token-driven SVG)
// ============================================================

const COLOR = {
  accent: "var(--color-accent)",
  profit: "var(--color-profit)",
  negative: "var(--color-negative)",
  line: "var(--color-line)",
  faint: "var(--color-fg-faint)",
  muted: "var(--color-fg-muted)",
};

/** Horizontal proportion bar. `fill` is 0-1 of the track. */
export function BarMeter({
  fill,
  tone = "accent",
  height = 10,
}: {
  fill: number;
  tone?: "accent" | "profit" | "negative" | "warning";
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fill) ? fill : 0)) * 100;
  const bg =
    tone === "profit"
      ? "bg-profit"
      : tone === "negative"
        ? "bg-negative"
        : tone === "warning"
          ? "bg-warning"
          : "bg-accent";
  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface"
      style={{ height }}
    >
      <div
        className={cn("absolute inset-y-0 left-0 rounded-[var(--radius-pill)] transition-[width] duration-300 ease-[var(--ease-out)]", bg)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Price ladder: stop / entry / target placed on a vertical axis at their real
 * relative distances, with tinted risk and reward zones. Direction-aware.
 */
export function PriceLadder({
  entry,
  stop,
  target,
  direction,
  format = (n) => fmtNum(n, 2),
}: {
  entry: number;
  stop: number;
  target: number;
  direction: "LONG" | "SHORT";
  format?: (n: number) => string;
}) {
  const lo = Math.min(entry, stop, target);
  const hi = Math.max(entry, stop, target);
  const span = hi - lo || 1;
  const H = 200;
  const pad = 18;
  const yOf = (v: number) => pad + (1 - (v - lo) / span) * (H - pad * 2);

  const yEntry = yOf(entry);
  const yStop = yOf(stop);
  const yTarget = yOf(target);

  const rows: { label: string; value: number; y: number; color: string }[] = [
    { label: "Target", value: target, y: yTarget, color: COLOR.profit },
    { label: "Entry", value: entry, y: yEntry, color: COLOR.muted },
    { label: "Stop", value: stop, y: yStop, color: COLOR.negative },
  ].sort((a, b) => a.y - b.y);

  return (
    <svg viewBox={`0 0 320 ${H}`} className="w-full" role="img" aria-label="Stop, entry and target price levels">
      {/* reward zone: entry -> target */}
      <rect
        x="0"
        y={Math.min(yEntry, yTarget)}
        width="320"
        height={Math.abs(yTarget - yEntry)}
        fill={COLOR.profit}
        opacity={0.08}
      />
      {/* risk zone: entry -> stop */}
      <rect
        x="0"
        y={Math.min(yEntry, yStop)}
        width="320"
        height={Math.abs(yStop - yEntry)}
        fill={COLOR.negative}
        opacity={0.08}
      />
      {rows.map((r) => (
        <g key={r.label}>
          <line x1="0" y1={r.y} x2="320" y2={r.y} stroke={r.color} strokeWidth={r.label === "Entry" ? 1.5 : 1} strokeDasharray={r.label === "Entry" ? "0" : "4 4"} opacity={0.9} />
          <text x="4" y={r.y - 5} fontSize="11" fill={r.color} className="font-medium" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {r.label}
          </text>
          <text x="316" y={r.y - 5} fontSize="11" fill="var(--color-fg)" textAnchor="end" className="tnum">
            {format(r.value)}
          </text>
        </g>
      ))}
      <text x="316" y={H - 4} fontSize="10" fill={COLOR.faint} textAnchor="end">
        {direction === "LONG" ? "Long setup" : "Short setup"}
      </text>
    </svg>
  );
}

/** Single line curve with an optional vertical marker (e.g. Kelly optimum). */
export function CurveChart({
  points,
  markerX,
  format = (n) => fmtNum(n, 2),
  xLabel,
  yLabelLeft,
  yLabelRight,
}: {
  points: { x: number; y: number }[];
  markerX?: number;
  format?: (n: number) => string;
  xLabel?: string;
  yLabelLeft?: string;
  yLabelRight?: string;
}) {
  const W = 480;
  const H = 200;
  const padX = 8;
  const padTop = 12;
  const padBottom = 22;
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys, 0);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const px = (x: number) => padX + ((x - xMin) / xSpan) * (W - padX * 2);
  const py = (y: number) => padTop + (1 - (y - yMin) / ySpan) * (H - padTop - padBottom);

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
  const zeroY = py(0);
  const markerPx = markerX != null ? px(markerX) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Calculation curve">
      <line x1={padX} y1={zeroY} x2={W - padX} y2={zeroY} stroke={COLOR.line} strokeWidth="1" />
      <path d={`${d} L${px(xMax).toFixed(1)},${zeroY.toFixed(1)} L${px(xMin).toFixed(1)},${zeroY.toFixed(1)} Z`} fill={COLOR.accent} opacity={0.1} />
      <path d={d} fill="none" stroke={COLOR.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {markerPx != null ? (
        <g>
          <line x1={markerPx} y1={padTop} x2={markerPx} y2={H - padBottom} stroke={COLOR.profit} strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx={markerPx} cy={py(points.reduce((best, p) => (Math.abs(p.x - (markerX ?? 0)) < Math.abs(best.x - (markerX ?? 0)) ? p : best), points[0]).y)} r="3.5" fill={COLOR.profit} />
        </g>
      ) : null}
      {yLabelLeft ? <text x={padX} y={padTop} fontSize="10" fill={COLOR.faint}>{yLabelLeft}</text> : null}
      {yLabelRight ? <text x={W - padX} y={padTop} fontSize="10" fill={COLOR.faint} textAnchor="end">{yLabelRight}</text> : null}
      {xLabel ? <text x={W / 2} y={H - 4} fontSize="10" fill={COLOR.faint} textAnchor="middle">{xLabel}</text> : null}
      <text x={padX} y={H - 4} fontSize="10" fill={COLOR.faint}>{format(xMin)}</text>
      <text x={W - padX} y={H - 4} fontSize="10" fill={COLOR.faint} textAnchor="end">{format(xMax)}</text>
    </svg>
  );
}

/**
 * Equity-path chart: draws many faint sample paths plus an optional bold path
 * (e.g. the median) and a dashed starting baseline. Used by Monte Carlo and the
 * compounding projection.
 */
export function EquityPaths({
  paths,
  baseline,
  highlight,
  height = 240,
}: {
  paths: number[][];
  baseline?: number;
  highlight?: number[];
  height?: number;
}) {
  const W = 520;
  const H = height;
  const padX = 6;
  const padY = 12;
  const all = paths.flat();
  if (highlight) all.push(...highlight);
  if (baseline != null) all.push(baseline);
  if (all.length === 0) return null;
  const yMin = Math.min(...all);
  const yMax = Math.max(...all);
  const ySpan = yMax - yMin || 1;
  const maxLen = Math.max(...paths.map((p) => p.length), highlight?.length ?? 0, 2);
  const px = (i: number) => padX + (i / (maxLen - 1)) * (W - padX * 2);
  const py = (v: number) => padY + (1 - (v - yMin) / ySpan) * (H - padY * 2);

  const toPath = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Simulated equity paths">
      {baseline != null ? (
        <line x1={padX} y1={py(baseline)} x2={W - padX} y2={py(baseline)} stroke={COLOR.line} strokeWidth="1" strokeDasharray="5 4" />
      ) : null}
      {paths.map((p, i) => (
        <path key={i} d={toPath(p)} fill="none" stroke={COLOR.accent} strokeWidth="1" opacity={0.18} vectorEffect="non-scaling-stroke" />
      ))}
      {highlight ? (
        <path d={toPath(highlight)} fill="none" stroke={COLOR.profit} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}

/** Distribution histogram; bars are tinted by side of the baseline. */
export function DistributionChart({
  bins,
  baseline,
  height = 160,
  format = fmtCompact,
}: {
  bins: { x0: number; x1: number; count: number }[];
  baseline?: number;
  height?: number;
  format?: (n: number) => string;
}) {
  const W = 520;
  const H = height;
  const padBottom = 18;
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const bw = W / bins.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Distribution of outcomes">
      {bins.map((b, i) => {
        const h = (b.count / maxCount) * (H - padBottom - 6);
        const below = baseline != null && b.x1 <= baseline;
        return (
          <rect
            key={i}
            x={i * bw + 1}
            y={H - padBottom - h}
            width={bw - 2}
            height={Math.max(0, h)}
            rx="2"
            fill={below ? COLOR.negative : COLOR.profit}
            opacity={0.7}
          />
        );
      })}
      <text x="2" y={H - 4} fontSize="10" fill={COLOR.faint}>{format(bins[0]?.x0 ?? 0)}</text>
      <text x={W - 2} y={H - 4} fontSize="10" fill={COLOR.faint} textAnchor="end">{format(bins[bins.length - 1]?.x1 ?? 0)}</text>
    </svg>
  );
}
