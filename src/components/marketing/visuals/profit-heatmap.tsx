"use client";

import { motion } from "motion/react";

export function ProfitHeatmap() {
  // Generate a random-looking but static grid of profit/loss intensities
  // 0 = neutral, 1-3 = profit, -1 to -2 = loss
  const gridPattern = [
    [0, 1, 0, 2, 3, 1, -1],
    [1, 2, 1, 0, -2, 1, 2],
    [3, 1, -1, 0, 1, 2, 3],
    [0, 0, 2, 3, 1, -1, 1],
    [1, -1, 0, 1, 2, 1, 0],
  ];

  const getColorClass = (value: number) => {
    if (value === 0) return "bg-black/5";
    if (value === 1) return "bg-emerald-400/40";
    if (value === 2) return "bg-emerald-400/70";
    if (value === 3) return "bg-emerald-500";
    if (value === -1) return "bg-red-400/40";
    if (value === -2) return "bg-red-500/70";
    return "bg-black/5";
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
      
      <div className="relative z-10 flex flex-col gap-2 p-6 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-end mb-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">P&L Calendar</div>
          <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded tnum">+14.2%</div>
        </div>

        <div className="flex flex-col gap-1.5">
          {gridPattern.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5">
              {row.map((val, colIndex) => (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: (colIndex + rowIndex) * 0.05 }}
                  className={`w-5 h-5 rounded-[4px] ${getColorClass(val)} border border-white/20 shadow-sm`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
