"use client";

import { useMemo } from "react";
import { CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import { byWeekday, summaryMetrics, type TradeRow } from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";
import { VBars } from "./charts";
import { WidgetShell, WidgetEmpty } from "./widget-kit";

const usd0 = (n: number) => formatUSD(n).replace(".00", "");

/**
 * Weekday P&L. Net profit by day of week (Mon to Fri), surfacing which days
 * carry or drag the edge. Real closed-trade data via `byWeekday`.
 */
export function WeekdayPerformanceWidget({ trades }: { trades: TradeRow[] }) {
  const { wd, count } = useMemo(() => {
    return { wd: byWeekday(trades), count: summaryMetrics(trades).count };
  }, [trades]);

  return (
    <WidgetShell icon={<CalendarCheck size={16} weight="duotone" />} title="Weekday P&L">
      {count === 0 ? (
        <WidgetEmpty message="P&L by day of week appears once the bot closes trades." />
      ) : (
        <div className="flex h-full items-center p-5">
          <div className="w-full">
            <VBars data={Object.entries(wd).map(([label, value]) => ({ label, value }))} format={usd0} />
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
