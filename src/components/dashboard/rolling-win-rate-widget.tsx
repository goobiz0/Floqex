"use client";

import { useMemo } from "react";
import { Pulse } from "@phosphor-icons/react/dist/ssr";
import { rollingWinRate, type TradeRow } from "@/lib/metrics";
import { LineMini } from "./charts";
import { WidgetShell, WidgetEmpty, WidgetBadge } from "./widget-kit";

/**
 * Rolling Win Rate. Win rate over a trailing window of closed trades, plotted as
 * a trend so consistency (or decay) is visible at a glance. Window is
 * configurable (10 / 20 / 30). Real closed-trade data via `rollingWinRate`.
 */
export function RollingWinRateWidget({ trades, window = "10" }: { trades: TradeRow[]; window?: string }) {
  const win = Number(window) || 10;
  const roll = useMemo(() => {
    // `rollingWinRate` expects chronological order; trades arrive newest-first.
    return rollingWinRate([...trades].reverse(), win);
  }, [trades, win]);

  return (
    <WidgetShell
      icon={<Pulse size={16} weight="duotone" />}
      title="Rolling Win Rate"
      right={<WidgetBadge>{`Window ${win}`}</WidgetBadge>}
    >
      {roll.length < 2 ? (
        <WidgetEmpty message="The win-rate trend draws once the bot has closed enough trades to fill the window." />
      ) : (
        <div className="flex h-full flex-col p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="tnum text-2xl font-semibold leading-none text-fg">
              {`${roll[roll.length - 1].toFixed(0)}%`}
            </span>
            <span className="text-[11px] text-fg-subtle">current</span>
          </div>
          <div className="min-h-0 flex-1">
            <LineMini values={roll} />
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
