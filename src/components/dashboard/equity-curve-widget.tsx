"use client";

import { useMemo } from "react";
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import { equitySeries, type DailyRow } from "@/lib/metrics";
import { EquityCurve } from "./equity-curve";
import { WidgetShell, WidgetEmpty } from "./widget-kit";

/**
 * Equity Curve widget. Thin wrapper that adds the titled card chrome and a
 * composed empty state around the existing `EquityCurve`, fed from the real
 * daily end-balance series. News overlay is disabled here so the widget stays
 * strictly real-data.
 */
export function EquityCurveWidget({ summaries }: { summaries: DailyRow[] }) {
  const series = useMemo(() => equitySeries(summaries), [summaries]);

  return (
    <WidgetShell icon={<ChartLineUp size={16} weight="duotone" />} title="Equity Curve">
      {series.length < 2 ? (
        <WidgetEmpty message="Your equity curve appears once the bot logs its first daily balances." />
      ) : (
        <div className="h-full overflow-y-auto overflow-x-hidden p-4">
          <EquityCurve series={series} enableNews={false} />
        </div>
      )}
    </WidgetShell>
  );
}
