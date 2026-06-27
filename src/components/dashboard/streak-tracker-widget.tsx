"use client";

import { useMemo } from "react";
import { Fire } from "@phosphor-icons/react/dist/ssr";
import { streaks, type TradeRow } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { WidgetShell, WidgetEmpty, Stat } from "./widget-kit";

/**
 * Win/Loss Streak. The current consecutive run (and its direction), the longest
 * winning and losing streaks on record, and a compact "recent form" strip of the
 * last closed trades. Real closed-trade data via `streaks`.
 */
export function StreakTrackerWidget({ trades }: { trades: TradeRow[] }) {
  const { s, form } = useMemo(() => {
    const closed = trades.filter((t) => t.status === "CLOSED");
    // Most recent up to 16 trades, oldest-to-newest for a left-to-right read.
    const form = closed
      .slice(0, 16)
      .reverse()
      .map((t) => {
        const pnl = t.netPnl ?? 0;
        return pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "FLAT";
      });
    return { s: streaks(trades), form };
  }, [trades]);

  if (form.length === 0) {
    return (
      <WidgetShell icon={<Fire size={16} weight="duotone" />} title="Win / Loss Streak">
        <WidgetEmpty message="Streaks and recent form appear once the bot closes trades." />
      </WidgetShell>
    );
  }

  const tone = s.currentType === "WIN" ? "positive" : s.currentType === "LOSS" ? "negative" : "neutral";
  const currentLabel =
    s.currentType === null ? "Flat" : `${s.current} ${s.currentType === "WIN" ? "win" : "loss"}${s.current === 1 ? "" : "es"}`;

  return (
    <WidgetShell icon={<Fire size={16} weight="duotone" />} title="Win / Loss Streak">
      <div className="flex h-full flex-col justify-center gap-5 p-5">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Current" tone={tone} value={currentLabel} />
          <Stat label="Best win run" tone="positive" value={String(s.longestWin)} />
          <Stat label="Worst loss run" tone="negative" value={String(s.longestLoss)} />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">Recent form</p>
          <div className="flex flex-wrap gap-1">
            {form.map((r, i) => (
              <span
                key={i}
                title={r === "WIN" ? "Win" : r === "LOSS" ? "Loss" : "Break-even"}
                className={cn(
                  "h-4 w-4 rounded-[4px]",
                  r === "WIN" && "bg-profit/80",
                  r === "LOSS" && "bg-negative/80",
                  r === "FLAT" && "bg-surface",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}
