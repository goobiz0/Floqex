"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChartLineUp, Funnel, Lightning } from "@phosphor-icons/react";

export function StrategyLogicTree() {
  const reduceMotion = useReducedMotion();

  // Glass Node Component
  const Node = ({ icon: Icon, label, delay = 0, color }: any) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 flex items-center gap-3 bg-white/60 backdrop-blur-md border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] rounded-2xl px-4 py-3"
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${color} bg-white shadow-sm border border-line/50`}>
        <Icon size={16} weight="bold" />
      </div>
      <span className="text-sm font-semibold text-fg tracking-tight">{label}</span>
    </motion.div>
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5" />
      
      {/* Container to handle positioning */}
      <div className="relative w-full max-w-[280px] h-[240px]">
        {/* SVG Path */}
        <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
          {/* Main path */}
          <path
            d="M 140 24 L 140 100 L 140 120"
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <path
            d="M 140 160 L 140 216"
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Animated glow packet */}
          {!reduceMotion && (
            <motion.circle
              r="4"
              fill="var(--color-blue-500, #3b82f6)"
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              animate={{
                cy: [24, 216],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "linear",
              }}
              cx="140"
            />
          )}
        </svg>

        {/* Nodes */}
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <Node icon={ChartLineUp} label="Price > VWAP" delay={0.1} color="text-blue-500" />
        </div>
        
        <div className="absolute inset-x-0 top-[96px] flex justify-center">
          <Node icon={Funnel} label="Volume > 1M" delay={0.2} color="text-purple-500" />
        </div>
        
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <Node icon={Lightning} label="Execute Long" delay={0.3} color="text-emerald-500" />
        </div>
      </div>
    </div>
  );
}
