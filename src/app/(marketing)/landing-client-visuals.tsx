"use client";

import { useRef, useEffect } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "motion/react";
import { Card } from "@/components/ui/card";

export function LandingClientVisuals() {
  const chartRef = useRef(null);
  const isInView = useInView(chartRef, { once: true, margin: "-100px" });
  
  const count = useMotionValue(0);
  const displayValue = useTransform(count, (v) => `${Math.round(v)}%`);
  const strokeDashoffset = useTransform(count, (v) => 251.2 - (251.2 * (v / 100)));

  useEffect(() => {
    if (isInView) {
      animate(count, 76, { duration: 2, ease: "easeOut", delay: 0.5 });
    }
  }, [isInView, count]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
      
      {/* Liquid Glass Overlay Backdrop Glow */}
      <div className="absolute inset-0 bg-white/20 blur-[100px] pointer-events-none -z-10" />

      {/* Bot Activity Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="lg:col-span-2 relative group"
      >
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-black/5" />
        
        <div className="p-8 h-full min-h-[400px] flex flex-col justify-between overflow-hidden relative z-10 rounded-[32px]">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
              Automated Operations
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)] animate-pulse" />
            </div>
          </div>
          
          <div className="relative mt-auto space-y-3">
            {[
              { label: "Long AAPL @ 180.20", profit: "+$120.50", tone: "profit", time: "10:24:01" },
              { label: "Short TSLA @ 210.00", profit: "+$45.00", tone: "profit", time: "10:23:45" },
              { label: "Long MSFT @ 415.30", profit: "-$22.00", tone: "loss", time: "10:21:12" },
            ].map((trade, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.1 }}
                className="flex items-center justify-between p-4 rounded-[16px] bg-white/40 border border-white/60 shadow-sm backdrop-blur-md hover:bg-white/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-1.5 h-1.5 rounded-full ${trade.tone === "profit" ? "bg-profit" : "bg-loss"}`} />
                  <div>
                    <div className="text-[15px] font-medium text-fg">{trade.label}</div>
                    <div className="text-xs text-fg-subtle tnum">{trade.time}</div>
                  </div>
                </div>
                <span className={`text-[15px] font-semibold tnum ${trade.tone === "profit" ? "text-profit" : "text-loss"}`}>
                  {trade.profit}
                </span>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-12 pt-8 border-t border-line/50">
            <h3 className="text-2xl font-medium tracking-tight text-fg">Live execution stream</h3>
            <p className="mt-2 text-fg-muted text-[15px]">Watch your strategies execute trades instantly, directly on the broker level.</p>
          </div>
        </div>
      </motion.div>

      {/* Analytics Card */}
      <motion.div
        ref={chartRef}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="relative group"
      >
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-black/5" />
        
        <div className="p-8 h-full min-h-[400px] flex flex-col justify-between overflow-hidden relative z-10 rounded-[32px]">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Performance
          </span>
          
          <div className="mt-8 flex justify-center items-center flex-1">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-sm">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="12" />
                <motion.circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke="var(--color-profit)" 
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  style={{ strokeDashoffset }}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span className="text-3xl font-semibold tracking-tight text-fg tnum">
                  {displayValue}
                </motion.span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle mt-1">Win Rate</span>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-line/50">
            <h3 className="text-2xl font-medium tracking-tight text-fg">Real-time metrics</h3>
            <p className="mt-2 text-fg-muted text-[15px]">Deep analytics to continually refine your edge.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
