"use client";

import { useMemo } from "react";
import { TrendDown } from "@phosphor-icons/react/dist/ssr";
import { equitySeries, maxDrawdown, currentDrawdown, type DailyRow } from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";
import { WidgetShell, WidgetEmpty, Stat } from "./widget-kit";

const W = 600;
const H = 120;
const PAD = 6;

/**
 * Drawdown Monitor. The risk metric the dashboard was missing: how far below the
 * equity peak the account is right now, the worst peak-to-trough drop on record,
 * and an "underwater" plot of depth-below-high over time. All from the real
 * daily end-balance series.
 */
export function DrawdownWidget({ summaries }: { summaries: DailyRow[] }) {
  const model = useMemo(() => {
    const series = equitySeries(summaries);
    if (series.length < 2) return null;

    // Depth below the running peak, in percent (<= 0), for the underwater plot.
    let peak = -Infinity;
    const dd = series.map((p) => {
      peak = Math.max(peak, p.equity);
      return peak > 0 ? ((p.equity - peak) / peak) * 100 : 0;
    });
    const min = Math.min(...dd); // most negative
    const yFor = (v: number) => (min < 0 ? PAD + (v / min) * (H - 2 * PAD) : PAD);
    const pts = dd.map((v, i) => ({ x: (i / (dd.length - 1)) * W, y: yFor(v) }));
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${W},${PAD} L0,${PAD} Z`;

    const max = maxDrawdown(series);
    const cur = currentDrawdown(series);
    return { line, area, max, cur, peak };
  }, [summaries]);

  if (!model) {
    return (
      <WidgetShell icon={<TrendDown size={16} weight="duotone" />} title="Drawdown Monitor">
        <WidgetEmpty message="Drawdown tracks once the bot has logged a few daily balances." />
      </WidgetShell>
    );
  }

  const { cur, max, peak } = model;
  const atHighs = cur.pct < 0.01;
  const curTone = atHighs ? "positive" : cur.pct >= max.pct * 0.8 ? "negative" : "warning";

  return (
    <WidgetShell icon={<TrendDown size={16} weight="duotone" />} title="Drawdown Monitor">
      <div className="flex h-full flex-col p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Current"
            tone={curTone}
            value={atHighs ? "At highs" : `-${cur.pct.toFixed(1)}%`}
            sub={atHighs ? "New equity peak" : `-${formatUSD(cur.amount).replace(".00", "")}`}
          />
          <Stat
            label="Max"
            tone="negative"
            value={`-${max.pct.toFixed(1)}%`}
            sub={`-${formatUSD(max.amount).replace(".00", "")}`}
          />
          <Stat label="Peak equity" value={formatUSD(peak).replace(".00", "")} />
        </div>

        <div className="relative mt-4 min-h-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Underwater drawdown plot, depth below the equity peak over time"
          >
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-negative)" stopOpacity="0.04" />
                <stop offset="100%" stopColor="var(--color-negative)" stopOpacity="0.28" />
              </linearGradient>
            </defs>
            <line x1="0" y1={PAD} x2={W} y2={PAD} stroke="var(--color-line-strong)" strokeWidth="1" strokeDasharray="4 4" />
            <path d={model.area} fill="url(#ddFill)" />
            <path
              d={model.line}
              fill="none"
              stroke="var(--color-negative)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="pointer-events-none absolute left-0 top-0 text-[10px] text-fg-faint">Peak</span>
        </div>
      </div>
    </WidgetShell>
  );
}
