"use client";

import { useMemo } from "react";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export function StreakHeatmapWidget({ timeframe = "90" }: { timeframe?: string }) {
  const days = parseInt(timeframe, 10);
  
  // Generate mock data for the heatmap
  const data = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      
      // Weekends have no trading data
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      let val = 0;
      if (!isWeekend) {
        // Randomly assign win/loss/neutral
        const r = Math.random();
        if (r > 0.4) val = Math.ceil(Math.random() * 3); // Win (1 to 3 intensity)
        else if (r > 0.2) val = -Math.ceil(Math.random() * 2); // Loss (-1 to -2 intensity)
        // else 0 (neutral)
      }
      
      arr.push({ date: d, val, isWeekend });
    }
    return arr;
  }, [days]);

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarBlank size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Trading Streak</h3>
        </div>
        <span className="text-xs text-fg-subtle">{days} Days</span>
      </div>
      
      <div className="flex-1 p-4 flex flex-col justify-center items-center overflow-hidden">
        <div className="flex flex-wrap gap-1 justify-center content-center h-full w-full max-w-[400px]">
          {data.map((d, i) => {
            let color = "bg-surface"; // neutral/weekend
            if (d.val > 0) {
              if (d.val === 1) color = "bg-profit/40";
              else if (d.val === 2) color = "bg-profit/70";
              else color = "bg-profit";
            } else if (d.val < 0) {
              if (d.val === -1) color = "bg-negative/50";
              else color = "bg-negative/80";
            }
            
            return (
              <div 
                key={i} 
                className={cn(
                  "w-3 h-3 rounded-[2px] transition-colors hover:ring-1 hover:ring-fg",
                  color,
                  d.isWeekend && "opacity-20"
                )}
                title={`${d.date.toDateString()}: ${d.val > 0 ? 'Profit' : d.val < 0 ? 'Loss' : 'Flat'}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
