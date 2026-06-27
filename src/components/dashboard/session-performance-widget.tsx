"use client";

import { useMemo } from "react";
import { Clock } from "@phosphor-icons/react/dist/ssr";
import { bySession } from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";
import type { TradeRow } from "@/lib/queries";
import { VBars } from "./charts";

// Net P&L split by trading session (Asia vs New York). Real data from the trade
// log: helps a trader see which session their edge actually lives in.
export function SessionPerformanceWidget({ trades = [] }: { trades?: TradeRow[] }) {
  const data = useMemo(() => {
    const s = bySession(trades);
    return [
      { label: "Asia", value: s.ASIA },
      { label: "New York", value: s.NY },
    ];
  }, [trades]);

  const hasData = trades.some((t) => t.status === "CLOSED");

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Session Performance</h3>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        {!hasData ? (
          <p className="text-center text-xs text-fg-subtle">Per-session P&amp;L appears once trades close.</p>
        ) : (
          <div className="w-full">
            <VBars data={data} format={(n) => formatUSD(n)} />
          </div>
        )}
      </div>
    </div>
  );
}
