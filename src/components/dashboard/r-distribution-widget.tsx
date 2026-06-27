"use client";

import { useMemo } from "react";
import { ChartBar } from "@phosphor-icons/react/dist/ssr";
import { rDistribution } from "@/lib/metrics";
import type { TradeRow } from "@/lib/queries";
import { Histogram } from "./charts";

// Distribution of realised R-multiples across closed trades. Shows edge quality
// at a glance: a healthy strategy has a fat right tail (winners) and a contained
// left tail (cut losers). Real data from the trade log.
export function RDistributionWidget({ trades = [] }: { trades?: TradeRow[] }) {
  const data = useMemo(() => rDistribution(trades), [trades]);
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <ChartBar size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">R-Multiple Spread</h3>
        </div>
        {total > 0 && <span className="tnum text-xs text-fg-subtle">{total} trades</span>}
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        {total === 0 ? (
          <p className="text-center text-xs text-fg-subtle">Your win/loss spread builds up as trades close.</p>
        ) : (
          <div className="w-full">
            <Histogram data={data} />
          </div>
        )}
      </div>
    </div>
  );
}
