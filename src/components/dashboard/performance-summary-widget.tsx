"use client";

import { useMemo } from "react";
import { Gauge } from "@phosphor-icons/react/dist/ssr";
import { summaryMetrics, type TradeRow, type DailyRow } from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import { WidgetShell, WidgetEmpty, Stat, WidgetBadge } from "./widget-kit";

const WINDOW_LABEL: Record<string, string> = {
  all: "All",
  "30": "Last 30",
  "7": "Last 7",
};

/**
 * Performance Summary. The compact KPI board a trader checks first: net P&L,
 * win rate, profit factor, expectancy (avg R), trade count, and the average
 * win vs average loss. Computed from real closed trades via `summaryMetrics`,
 * over an optional trailing window (all / last 30 / last 7 closed trades).
 */
export function PerformanceSummaryWidget({
  trades,
  summaries,
  window = "all",
}: {
  trades: TradeRow[];
  summaries: DailyRow[];
  window?: string;
}) {
  const m = useMemo(() => {
    const closed = trades.filter((t) => t.status === "CLOSED"); // newest-first
    const n = window === "30" ? 30 : window === "7" ? 7 : Infinity;
    const windowed = Number.isFinite(n) ? closed.slice(0, n) : closed;
    return summaryMetrics(windowed);
  }, [trades, window]);

  const startBalance = summaries[0]?.startBalance;
  const pf = Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : "∞";
  const expSign = m.expectancy >= 0 ? "+" : "";

  return (
    <WidgetShell
      icon={<Gauge size={16} weight="duotone" />}
      title="Performance Summary"
      right={<WidgetBadge>{WINDOW_LABEL[window] ?? "All"}</WidgetBadge>}
    >
      {m.count === 0 ? (
        <WidgetEmpty message="Your headline metrics populate once the bot closes trades." />
      ) : (
        <div className="grid h-full grid-cols-2 content-center gap-x-4 gap-y-5 p-5 sm:grid-cols-3">
          <Stat
            label="Net P&L"
            tone={m.total >= 0 ? "positive" : "negative"}
            value={
              <DisplayValue
                type="PNL"
                money={m.total}
                percent={startBalance ? (m.total / startBalance) * 100 : undefined}
              />
            }
          />
          <Stat label="Win rate" value={`${m.winRate.toFixed(1)}%`} />
          <Stat
            label="Profit factor"
            tone={Number.isFinite(m.profitFactor) && m.profitFactor < 1 ? "negative" : "neutral"}
            value={pf}
          />
          <Stat
            label="Expectancy"
            tone={m.expectancy >= 0 ? "positive" : "negative"}
            value={`${expSign}${m.expectancy.toFixed(2)}R`}
          />
          <Stat label="Trades" value={String(m.count)} />
          <Stat
            label="Avg win / loss"
            value={
              <span className="text-sm">
                <span className="text-profit">{formatUSD(m.avgWin).replace(".00", "")}</span>
                <span className="px-1 text-fg-faint">/</span>
                <span className="text-negative">{formatUSD(-m.avgLoss).replace(".00", "")}</span>
              </span>
            }
          />
        </div>
      )}
    </WidgetShell>
  );
}
