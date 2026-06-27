"use client";

import { useMemo, useState } from "react";
import { ChartPieSlice } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { openExposure } from "@/lib/metrics";
import type { TradeRow } from "@/lib/queries";

// Ordered, token-driven palette so segment colours come from CSS variables only
// (no hardcoded hex). Cycles for accounts with many concurrent instruments.
const PALETTE = [
  "var(--color-accent)",
  "var(--color-profit)",
  "var(--color-info)",
  "var(--color-warning)",
  "var(--color-fg-muted)",
];

// Real capital-at-risk distribution from currently open positions. Notional is
// |entry * size| per open trade, grouped by instrument or direction. Shows an
// honest empty state when nothing is open rather than a fabricated allocation.
export function RiskMatrixWidget({
  groupBy = "asset",
  openTrades = [],
}: {
  groupBy?: "asset" | "direction";
  openTrades?: TradeRow[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const openCount = useMemo(() => openTrades.filter((t) => t.status === "OPEN").length, [openTrades]);

  const cx = 50;
  const cy = 50;
  const r = 40;
  const circum = 2 * Math.PI * r;

  const segments = useMemo(() => {
    const exposure = openExposure(openTrades, groupBy);
    // Cumulative offset computed functionally (no in-render reassignment): each
    // segment starts after the sum of all preceding arc lengths.
    return exposure.map((e, i) => {
      const precedingLen = exposure
        .slice(0, i)
        .reduce((s, p) => s + (p.pct / 100) * circum, 0);
      return {
        id: e.label,
        label: e.label,
        value: e.pct,
        color: PALETTE[i % PALETTE.length],
        dash: `${(e.pct / 100) * circum} ${circum}`,
        dashOffset: -precedingLen,
      };
    });
  }, [openTrades, groupBy, circum]);

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <ChartPieSlice size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Risk Exposure</h3>
        </div>
        <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-1.5 py-0.5 text-xs font-medium capitalize text-fg-subtle">
          {groupBy}
        </span>
      </div>

      {segments.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center text-xs text-fg-subtle">No open positions. Exposure appears here while trades are live.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden p-4 md:flex-row">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              {segments.map((seg) => {
                const isHovered = hovered === seg.id;
                const isDimmed = hovered !== null && !isHovered;
                return (
                  <circle
                    key={seg.id}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isHovered ? 16 : 12}
                    strokeDasharray={seg.dash}
                    strokeDashoffset={seg.dashOffset}
                    className={cn("cursor-pointer transition-all duration-300 ease-out", isDimmed && "opacity-30")}
                    onMouseEnter={() => setHovered(seg.id)}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-fg-subtle">{openCount} open</span>
            </div>
          </div>

          <div className="flex min-w-[120px] flex-col gap-2">
            {segments.map((seg) => {
              const isDimmed = hovered !== null && hovered !== seg.id;
              return (
                <div
                  key={seg.id}
                  className={cn("flex cursor-default items-center gap-2 transition-opacity", isDimmed && "opacity-30")}
                  onMouseEnter={() => setHovered(seg.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="whitespace-nowrap text-xs font-medium text-fg">{seg.label}</span>
                  <span className="tnum ml-auto text-xs text-fg-subtle">{seg.value.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
