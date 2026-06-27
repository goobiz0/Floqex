"use client";

import { useMemo } from "react";
import { TrendDown } from "@phosphor-icons/react/dist/ssr";
import { equitySeries, drawdownSeries, maxDrawdown } from "@/lib/metrics";
import type { DailyRow } from "@/lib/queries";
import { Sparkline } from "./charts/sparkline";

// Underwater equity plot: percent below the running peak over the lookback. Real
// data derived from daily summaries. The single most requested chart for serious
// traders, and Floqex already computes max drawdown.
export function DrawdownWidget({
  summaries = [],
  timeframe = "90",
}: {
  summaries?: DailyRow[];
  timeframe?: string;
}) {
  const days = parseInt(timeframe, 10) || 90;

  const { series, maxDd } = useMemo(() => {
    const sliced = summaries.slice(-days);
    const eq = equitySeries(sliced);
    const dd = drawdownSeries(eq);
    return { series: dd.map((d) => d.ddPct), maxDd: maxDrawdown(eq).pct };
  }, [summaries, days]);

  const hasData = series.length >= 2;

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendDown size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Drawdown</h3>
        </div>
        {hasData && (
          <span className="tnum text-xs font-medium text-negative">Max {maxDd.toFixed(1)}%</span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-hidden p-4">
        {!hasData ? (
          <p className="text-center text-xs text-fg-subtle">Drawdown appears once your account has a few days of history.</p>
        ) : (
          <div className="h-full min-h-[80px] w-full">
            <Sparkline values={series} tone="negative" baseline fill />
          </div>
        )}
      </div>
    </div>
  );
}
