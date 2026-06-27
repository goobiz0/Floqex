"use client";

import { useMemo } from "react";
import { Scales } from "@phosphor-icons/react/dist/ssr";
import { summaryMetrics, grossProfitLoss, type TradeRow } from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";
import { WidgetShell, WidgetEmpty, Stat } from "./widget-kit";

/**
 * Profit Factor. Gross profit divided by gross loss, the single cleanest read on
 * whether the edge pays for its losers. Shows the ratio plus the split of gross
 * profit against gross loss as one proportional bar. Real closed-trade data.
 */
export function ProfitFactorWidget({ trades }: { trades: TradeRow[] }) {
  const model = useMemo(() => {
    const m = summaryMetrics(trades);
    const { grossWin, grossLoss } = grossProfitLoss(trades);
    return { m, grossWin, grossLoss };
  }, [trades]);

  const { m, grossWin, grossLoss } = model;
  if (m.count === 0) {
    return (
      <WidgetShell icon={<Scales size={16} weight="duotone" />} title="Profit Factor">
        <WidgetEmpty message="Profit factor is the ratio of gross wins to gross losses, shown once trades close." />
      </WidgetShell>
    );
  }

  const total = grossWin + grossLoss;
  const winPct = total > 0 ? (grossWin / total) * 100 : 100;
  const pfFinite = Number.isFinite(m.profitFactor);
  const pf = pfFinite ? m.profitFactor : Infinity;
  const ratioLabel = pfFinite ? pf.toFixed(2) : "∞";
  const tone = !pfFinite || pf >= 1.5 ? "positive" : pf >= 1 ? "warning" : "negative";
  const wins = Math.round((m.winRate / 100) * m.count);

  return (
    <WidgetShell icon={<Scales size={16} weight="duotone" />} title="Profit Factor">
      <div className="flex h-full flex-col justify-center gap-5 p-5">
        <div className="flex items-end justify-between">
          <Stat
            label="Profit factor"
            tone={tone}
            value={<span className="text-3xl">{ratioLabel}</span>}
            sub={pf >= 1 || !pfFinite ? "Wins outpace losses" : "Losses outpace wins"}
          />
          <Stat label="Win rate" value={`${m.winRate.toFixed(1)}%`} sub={`${wins} of ${m.count}`} />
        </div>

        <div>
          <div className="flex h-3 w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface">
            <div className="h-full bg-profit transition-[width] duration-500" style={{ width: `${winPct}%` }} />
            <div className="h-full bg-negative transition-[width] duration-500" style={{ width: `${100 - winPct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-medium tnum">
            <span className="text-profit">+{formatUSD(grossWin).replace(".00", "")} gross</span>
            <span className="text-negative">-{formatUSD(grossLoss).replace(".00", "")} gross</span>
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}
