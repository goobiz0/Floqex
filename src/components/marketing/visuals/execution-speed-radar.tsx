"use client";

import { motion, useReducedMotion } from "motion/react";
import { HardDrives } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export function ExecutionSpeedRadar() {
  const reduceMotion = useReducedMotion();
  const [latency, setLatency] = useState(4);

  // Simulate latency fluctuations
  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setLatency((prev) => (Math.random() > 0.8 ? (prev === 4 ? 5 : 4) : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  const ExchangeNode = ({ name, x, y, delay }: any) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="absolute flex items-center gap-1.5"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--color-accent)]" />
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-fg uppercase tracking-wider">{name}</span>
        <span className="text-[10px] text-fg-subtle tnum font-semibold">{latency}ms</span>
      </div>
    </motion.div>
  );

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none p-6">
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent" />

      {/* Radar Rings */}
      <div className="absolute w-[240px] h-[240px] rounded-full border border-line/40" />
      <div className="absolute w-[160px] h-[160px] rounded-full border border-line/60" />
      <div className="absolute w-[80px] h-[80px] rounded-full border border-line/80" />

      {/* Central Node */}
      <div className="relative z-10 w-12 h-12 rounded-full bg-white/80 backdrop-blur-xl border border-white flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <HardDrives size={20} className="text-fg" weight="fill" />
        
        {/* Radiating pulse */}
        {!reduceMotion && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border border-accent/40"
              animate={{ scale: [1, 4], opacity: [0.8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-accent/30"
              animate={{ scale: [1, 4], opacity: [0.8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
            />
          </>
        )}
      </div>

      {/* Exchange Nodes */}
      <ExchangeNode name="NYSE" x={85} y={30} delay={0.2} />
      <ExchangeNode name="CME" x={15} y={65} delay={0.4} />
      <ExchangeNode name="NASDAQ" x={75} y={85} delay={0.6} />
    </div>
  );
}
