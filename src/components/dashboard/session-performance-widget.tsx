"use client";

import { useMemo } from "react";
import { ClockClockwise } from "@phosphor-icons/react/dist/ssr";
import { bySession, summaryMetrics, type TradeRow } from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";
import { VBars } from "./charts";
import { WidgetShell, WidgetEmpty } from "./widget-kit";

const usd0 = (n: number) => formatUSD(n).replace(".00", "");

/**
 * Session P&L. Net profit split between the Asia and New York sessions, so the
 * trader can see which session the edge actually comes from. Real closed-trade
 * data via `bySession`.
 */
export function SessionPerformanceWidget({ trades }: { trades: TradeRow[] }) {
  const { sess, count } = useMemo(() => {
    return { sess: bySession(trades), count: summaryMetrics(trades).count };
  }, [trades]);

  return (
    <WidgetShell icon={<ClockClockwise size={16} weight="duotone" />} title="Session P&L">
      {count === 0 ? (
        <WidgetEmpty message="P&L split by trading session appears once the bot closes trades." />
      ) : (
        <div className="flex h-full items-center p-5">
          <div className="w-full">
            <VBars
              data={[
                { label: "Asia", value: sess.ASIA },
                { label: "New York", value: sess.NY },
              ]}
              format={usd0}
            />
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
