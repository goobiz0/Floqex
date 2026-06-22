"use client";

import { useRef, useEffect } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "motion/react";
import { Card } from "@/components/ui/card";

export function LandingClientVisuals() {
  const chartRef = useRef(null);
  const isInView = useInView(chartRef, { once: true, margin: "-100px" });
  
  // Motion values for the counter and stroke
  const count = useMotionValue(0);
  const displayValue = useTransform(count, (v) => `${Math.round(v)}%`);
  const strokeDashoffset = useTransform(count, (v) => 251.2 - (251.2 * (v / 100)));

  useEffect(() => {
    if (isInView) {
      animate(count, 76, { duration: 2, ease: "easeOut" });
    }
  }, [isInView, count]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Bot Activity Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-2"
      >
        <Card className="p-8 h-full min-h-[400px] flex flex-col justify-between overflow-hidden relative group rounded-[32px] border-line">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 transition-opacity group-hover:opacity-100 opacity-50" />
          
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
              Automated Operations
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
            </div>
          </div>
          
          <div className="relative z-10 mt-8">
            <div className="space-y-4">
              {[
                { label: "Long AAPL @ 180.20", profit: "+$120.50", tone: "profit" },
                { label: "Short TSLA @ 210.00", profit: "+$45.00", tone: "profit" },
                { label: "Long MSFT @ 415.30", profit: "-$22.00", tone: "loss" },
              ].map((trade, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-[16px] bg-surface/50 border border-line backdrop-blur-sm"
                >
                  <span className="text-sm font-medium text-fg">{trade.label}</span>
                  <span className={`text-sm font-semibold ${trade.tone === "profit" ? "text-profit" : "text-loss"}`}>
                    {trade.profit}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="relative z-10 mt-12">
            <h3 className="text-2xl font-medium tracking-tight text-fg">Live execution stream</h3>
            <p className="mt-2 text-fg-muted">Watch your strategies execute trades instantly.</p>
          </div>
        </Card>
      </motion.div>

      {/* Analytics Card */}
      <motion.div
        ref={chartRef}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-8 h-full min-h-[400px] flex flex-col justify-between overflow-hidden relative group rounded-[32px] border-line">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 blur-[60px] rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-125" />
          
          <div className="relative z-10">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
              Performance
            </span>
            <div className="mt-8 flex justify-center">
              <div className="relative w-40 h-40">
                {/* SVG Donut Chart representation */}
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-line)" strokeWidth="12" />
                  <motion.circle 
                    cx="50" cy="50" r="40" fill="none" 
                    stroke="var(--color-profit)" 
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span className="text-2xl font-semibold tracking-tight tabular-nums">
                    {displayValue}
                  </motion.span>
                  <span className="text-[10px] uppercase tracking-wider text-fg-subtle">Win Rate</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-12">
            <h3 className="text-2xl font-medium tracking-tight text-fg">Real-time metrics</h3>
            <p className="mt-2 text-fg-muted">Deep analytics to refine your edge.</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
