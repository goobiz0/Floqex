"use client";

import { motion, useReducedMotion } from "motion/react";
import { WarningCircle } from "@phosphor-icons/react";

export function HardStopVisualizer() {
  const reduceMotion = useReducedMotion();

  // The path starts high, drops jaggedly, then perfectly flattens
  const pathD = "M 0 40 L 40 50 L 80 30 L 120 90 L 140 120 L 280 120";
  
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent" />

      <div className="relative w-full max-w-[280px] h-[160px]">
        {/* Background Grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />

        {/* Daily Loss Limit Line */}
        <div className="absolute top-[120px] left-0 w-full flex items-center gap-2">
          <div className="w-full h-[2px] bg-red-500/40 border-t border-dashed border-red-500/80" />
          <span className="absolute right-0 -top-5 text-[10px] font-bold text-red-500 uppercase tracking-wider">Loss Limit</span>
        </div>

        {/* Equity Curve */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="none">
          <motion.path
            d={pathD}
            fill="none"
            stroke="var(--color-fg)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "linear", repeat: Infinity, repeatDelay: 1 }}
            className="drop-shadow-sm"
          />
        </svg>

        {/* System Halt Badge */}
        {!reduceMotion && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0], scale: [0.9, 0.9, 1, 1] }}
            transition={{ duration: 3, times: [0, 0.4, 0.45, 1], repeat: Infinity, ease: "easeOut" }}
            className="absolute left-[140px] top-[120px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex items-center gap-1.5 bg-red-500 text-white px-2 py-1 rounded-md shadow-lg shadow-red-500/20 ring-1 ring-white/20">
              <WarningCircle size={14} weight="bold" />
              <span className="text-[10px] font-bold uppercase tracking-wider">System Halt</span>
            </div>
            {/* Ping effect on the halt point */}
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-50" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
