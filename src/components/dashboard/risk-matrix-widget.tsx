"use client";

import { useMemo, useState } from "react";
import { ChartPieSlice, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type Segment = {
  id: string;
  label: string;
  value: number;
  color: string;
};

// Simplified mock data
const MOCK_DATA = {
  asset: [
    { id: "1", label: "EUR/USD", value: 45, color: "bg-accent" },
    { id: "2", label: "BTC/USD", value: 30, color: "bg-profit" },
    { id: "3", label: "XAU/USD", value: 25, color: "bg-warning" },
  ],
  strategy: [
    { id: "1", label: "Momentum", value: 60, color: "bg-accent" },
    { id: "2", label: "Mean Reversion", value: 25, color: "bg-profit" },
    { id: "3", label: "Grid", value: 15, color: "bg-fg-muted" },
  ]
};

export function RiskMatrixWidget({ groupBy = "asset" }: { groupBy?: "asset" | "strategy" }) {
  const [hovered, setHovered] = useState<string | null>(null);
  
  const segments = useMemo(() => MOCK_DATA[groupBy] || MOCK_DATA.asset, [groupBy]);
  
  // Calculate SVG circles
  let total = 0;
  segments.forEach(s => total += s.value);
  
  let currentOffset = 0;
  const cx = 50;
  const cy = 50;
  const r = 40;
  const circum = 2 * Math.PI * r;

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <ChartPieSlice size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Risk Exposure</h3>
        </div>
        <div className="flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 border border-line cursor-pointer text-xs font-medium text-fg-subtle">
          <span className="capitalize">{groupBy}</span>
        </div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col md:flex-row items-center justify-center gap-6 overflow-hidden">
        
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-md">
            {segments.map((seg) => {
              const strokeDasharray = `${(seg.value / total) * circum} ${circum}`;
              const strokeDashoffset = -currentOffset;
              currentOffset += (seg.value / total) * circum;
              
              const isHovered = hovered === seg.id;
              const isDimmed = hovered !== null && !isHovered;
              
              // Map tailwind classes to raw colors for SVG
              let rawColor = "#10b981"; // default profit
              if (seg.color.includes("accent")) rawColor = "var(--color-accent)";
              if (seg.color.includes("warning")) rawColor = "var(--color-warning)";
              if (seg.color.includes("fg-muted")) rawColor = "var(--color-fg-muted)";

              return (
                <circle
                  key={seg.id}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="transparent"
                  stroke={rawColor}
                  strokeWidth={isHovered ? 16 : 12}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(
                    "transition-all duration-300 ease-out cursor-pointer",
                    isDimmed && "opacity-30",
                    isHovered && "drop-shadow-lg"
                  )}
                  onMouseEnter={() => setHovered(seg.id)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-semibold text-fg-subtle">100%</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 min-w-[120px]">
          {segments.map((seg) => {
            const isHovered = hovered === seg.id;
            const isDimmed = hovered !== null && !isHovered;
            
            return (
              <div 
                key={seg.id} 
                className={cn(
                  "flex items-center gap-2 transition-opacity cursor-default",
                  isDimmed && "opacity-30"
                )}
                onMouseEnter={() => setHovered(seg.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className={cn("w-2 h-2 rounded-full", seg.color)} />
                <span className="text-xs font-medium text-fg whitespace-nowrap">{seg.label}</span>
                <span className="text-xs font-mono text-fg-subtle ml-auto">{seg.value}%</span>
              </div>
            );
          })}
        </div>
        
      </div>
    </div>
  );
}
