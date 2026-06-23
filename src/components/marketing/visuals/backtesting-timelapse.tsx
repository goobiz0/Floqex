"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function BacktestingTimelapse() {
  const reduceMotion = useReducedMotion();
  const [year, setYear] = useState(2018);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setYear((prev) => (prev >= 2026 ? 2018 : prev + 1));
    }, 400); // Super fast tick
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div className="relative w-full h-[180px] flex flex-col items-center justify-center p-6 overflow-hidden pointer-events-none rounded-2xl bg-white/40 border border-white/60 shadow-[inset_0_2px_20px_rgba(0,0,0,0.02)] backdrop-blur-sm mt-8">
      
      {/* Background timeline grid */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "linear-gradient(90deg, var(--color-line) 1px, transparent 1px)", backgroundSize: "40px 100%" }}
      />

      {/* Scrubbing Candles (abstracted as a moving SVG path to avoid high DOM node count) */}
      <svg className="absolute inset-0 w-[200%] h-full opacity-60" viewBox="0 0 1000 100" preserveAspectRatio="none">
        <motion.path
          d="M 0 80 Q 20 20 40 70 T 80 40 T 120 60 T 160 30 T 200 80 T 240 20 T 280 60 T 320 10 T 360 90 T 400 40 T 440 20 T 480 70 T 520 30 T 560 80 T 600 20 T 640 50 T 680 10 T 720 80 T 760 30 T 800 60 T 840 20 T 880 70 T 920 40 T 960 10 T 1000 50"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ x: 0 }}
          animate={{ x: -500 }}
          transition={{ duration: 3.2, ease: "linear", repeat: Infinity }}
        />
        {/* Shaded area underneath */}
        <motion.path
          d="M 0 80 Q 20 20 40 70 T 80 40 T 120 60 T 160 30 T 200 80 T 240 20 T 280 60 T 320 10 T 360 90 T 400 40 T 440 20 T 480 70 T 520 30 T 560 80 T 600 20 T 640 50 T 680 10 T 720 80 T 760 30 T 800 60 T 840 20 T 880 70 T 920 40 T 960 10 T 1000 50 L 1000 100 L 0 100 Z"
          fill="var(--color-accent)"
          fillOpacity="0.1"
          initial={{ x: 0 }}
          animate={{ x: -500 }}
          transition={{ duration: 3.2, ease: "linear", repeat: Infinity }}
        />
      </svg>

      {/* The large glass overlay counter */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.div 
          key={year}
          initial={{ opacity: 0.5, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1 }}
          className="text-5xl md:text-6xl font-bold tracking-tighter text-fg drop-shadow-md tnum"
        >
          {year}
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-widest text-fg-subtle mt-1 bg-white/80 px-2 py-0.5 rounded shadow-sm">
          Processing
        </span>
      </div>

      {/* Scrubber vertical line */}
      <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-accent shadow-[0_0_12px_var(--color-accent)]" />
    </div>
  );
}
