"use client";

import { useMemo } from "react";
import { ChartBar } from "@phosphor-icons/react/dist/ssr";
import { rDistribution, summaryMetrics, type TradeRow } from "@/lib/metrics";
import { Histogram } from "./charts";
import { WidgetShell, WidgetEmpty, WidgetBadge } from "./widget-kit";

/**
 * R-Multiple Distribution. The shape of the edge: how many trades land in each
 * realised-R bucket, with expectancy (mean R per trade) called out in the
 * header. Built from real `rMultiple` values via the shared `Histogram`.
 */
export function RDistributionWidget({ trades }: { trades: TradeRow[] }) {
  const { dist, expectancy, count } = useMemo(() => {
    const m = summaryMetrics(trades);
    return { dist: rDistribution(trades), expectancy: m.expectancy, count: m.count };
  }, [trades]);

  const expSign = expectancy >= 0 ? "+" : "";

  return (
    <WidgetShell
      icon={<ChartBar size={16} weight="duotone" />}
      title="R-Multiple Distribution"
      right={count > 0 ? <WidgetBadge>{`Exp ${expSign}${expectancy.toFixed(2)}R`}</WidgetBadge> : undefined}
    >
      {count === 0 ? (
        <WidgetEmpty message="The spread of trade outcomes by R-multiple appears once trades close." />
      ) : (
        <div className="flex h-full items-center p-5">
          <div className="w-full">
            <Histogram data={dist} />
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
