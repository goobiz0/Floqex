"use client";

import { motion } from "motion/react";
import { formatUSD } from "@/lib/utils";
import type { TradeRow } from "@/lib/queries";
import { MagnifyingGlass, Swap } from "@phosphor-icons/react";

export function TradesTable({ trades }: { trades: TradeRow[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-line rounded-[var(--radius-card)] bg-surface/30">
        <div className="h-12 w-12 rounded-full bg-surface border border-line flex items-center justify-center text-fg-subtle mb-4">
          <Swap size={24} />
        </div>
        <h3 className="text-sm font-medium text-fg">No trades executed</h3>
        <p className="text-xs text-fg-subtle mt-1 text-center max-w-sm">
          Awaiting signals from your active strategies. Your execution history will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-sm)]">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-line bg-base/50 text-fg-subtle text-[11px] uppercase tracking-wider font-semibold">
            <th className="py-4 pl-6 pr-3">Date</th>
            <th className="py-4 px-3">Instrument</th>
            <th className="py-4 px-3">Dir</th>
            <th className="py-4 px-3 text-right">Entry</th>
            <th className="py-4 px-3 text-right">Exit</th>
            <th className="py-4 px-3 text-right">Net P/L</th>
            <th className="py-4 pl-3 pr-6 text-right">R-Mult</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/30">
          {trades.map((trade, i) => {
            const pnl = Number(trade.netPnl);
            const rMult = Number(trade.rMultiple);
            const isWin = pnl > 0;
            const dateObj = new Date(trade.openedAt);
            
            return (
              <motion.tr 
                key={trade.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.03, ease: [0.23, 1, 0.32, 1] }}
                className="group hover:bg-base/50 transition-colors"
              >
                <td className="py-3 pl-6 pr-3 text-fg-muted text-[13px]">
                  {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })} <span className="text-fg-faint">{dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </td>
                <td className="py-3 px-3 font-medium text-fg text-[13px]">
                  {trade.instrument}
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${trade.direction === "LONG" ? "bg-profit/10 text-profit" : "bg-negative-soft text-negative"}`}>
                    {trade.direction}
                  </span>
                </td>
                <td className="py-3 px-3 text-right tnum text-fg-subtle text-[13px]">
                  {trade.entryPrice.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right tnum text-fg-subtle text-[13px]">
                  {trade.exitPrice ? trade.exitPrice.toFixed(2) : "—"}
                </td>
                <td className={`py-3 px-3 text-right tnum font-medium text-[13px] ${pnl > 0 ? "text-profit" : pnl < 0 ? "text-negative" : "text-fg-subtle"}`}>
                  {pnl > 0 ? "+" : ""}{formatUSD(pnl)}
                </td>
                <td className={`py-3 pl-3 pr-6 text-right tnum text-[13px] ${rMult >= 1 ? "text-profit" : rMult <= -1 ? "text-negative" : "text-fg-subtle"}`}>
                  {rMult.toFixed(2)}R
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
