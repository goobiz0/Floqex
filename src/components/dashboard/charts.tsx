import { cn } from "@/lib/utils";

/** Horizontal bars, signed (emerald positive / red negative). */
export function HBars({
  data,
  format = (n) => String(n),
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = (Math.abs(d.value) / max) * 100;
        const pos = d.value >= 0;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-fg-subtle">{d.label}</span>
            <div className="relative h-5 flex-1 rounded-[4px] bg-base/60">
              <div
                className={cn(
                  "absolute inset-y-0 rounded-[4px] bar-rise-x",
                  pos ? "left-0 bg-profit/80" : "left-0 bg-negative/80",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              className={cn(
                "tnum w-20 shrink-0 text-right text-xs font-medium",
                pos ? "text-profit" : "text-negative",
              )}
            >
              {format(d.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Vertical bars, signed. Good for day-of-week / session breakdowns. */
export function VBars({
  data,
  format = (n) => String(n),
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <div className="flex h-44 items-end gap-3">
      {data.map((d) => {
        const pct = (Math.abs(d.value) / max) * 100;
        const pos = d.value >= 0;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full flex-col justify-end">
              <div
                className={cn(
                  "w-full rounded-t-[4px] bar-rise-y",
                  pos ? "bg-profit/80" : "bg-negative/80",
                )}
                style={{ height: `${Math.max(4, pct)}%` }}
              />
            </div>
            <span className="text-xs text-fg-subtle">{d.label}</span>
            <span
              className={cn(
                "tnum text-[0.7rem] font-medium",
                pos ? "text-profit" : "text-negative",
              )}
            >
              {format(d.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Simple counts histogram (no sign coloring). */
export function Histogram({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-44 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-full w-full flex-col justify-end">
            <div
              className="w-full rounded-t-[4px] bg-accent/70 bar-rise-y"
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-fg-subtle">{d.label}</span>
          <span className="tnum text-[0.7rem] font-medium text-fg-muted">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Rolling line (e.g. win rate). */
export function LineMini({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 600;
  const H = 160;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - 12 - ((v - min) / span) * (H - 24);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1="0" y1={H * p} x2={W} y2={H * p} stroke="var(--color-line)" strokeWidth="1" />
      ))}
      <path d={pts.join(" ")} fill="none" stroke="var(--color-profit)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
