"use client";

import { useMemo } from "react";
import { Gauge } from "@phosphor-icons/react/dist/ssr";
import { openExposure } from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";
import type { TradeRow } from "@/lib/queries";

// Real capital utilization: total open-position notional as a share of account
// balance. A live read of how much of the account is currently committed.
export function ExposureWidget({
  openTrades = [],
  balance = 0,
  hasAccount = false,
}: {
  openTrades?: TradeRow[];
  balance?: number;
  hasAccount?: boolean;
}) {
  const { notional, pct } = useMemo(() => {
    const total = openExposure(openTrades, "asset").reduce((s, e) => s + e.notional, 0);
    // Keep the true percentage (can exceed 100% with leverage); the arc clamps.
    return { notional: total, pct: balance > 0 ? (total / balance) * 100 : 0 };
  }, [openTrades, balance]);

  // A connected account with open exposure but no cash balance is a distinct,
  // higher-risk state, not 0% utilization. Surface it explicitly.
  const noBalance = hasAccount && balance <= 0 && notional > 0;

  // Utilization itself is neutral; only colour high usage as a caution.
  const stroke = pct > 80 ? "var(--color-negative)" : pct > 50 ? "var(--color-warning)" : "var(--color-accent)";
  const circ = 251;
  const dashOffset = circ - (circ * Math.min(100, pct)) / 100;

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <Gauge size={16} weight="duotone" className="text-accent" />
        <h3 className="text-[13px] font-semibold tracking-wide">Capital Utilization</h3>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        {!hasAccount ? (
          <p className="text-center text-xs text-fg-subtle">Connect an account to see capital utilization.</p>
        ) : noBalance ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="tnum text-lg font-bold text-negative">{formatUSD(notional)}</span>
            <p className="text-xs text-negative">Open exposure with no cash balance.</p>
          </div>
        ) : (
          <>
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-surface)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={stroke}
                  strokeWidth="8"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="tnum absolute text-lg font-bold text-fg">{pct.toFixed(0)}%</span>
            </div>
            <p className="tnum mt-3 text-xs text-fg-subtle">
              {formatUSD(notional)} of {formatUSD(balance)} deployed
            </p>
          </>
        )}
      </div>
    </div>
  );
}
