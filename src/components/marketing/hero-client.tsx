"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { authUrl } from "@/lib/urls";

export function HeroClient() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 300, damping: 24 }
    },
  };

  return (
    <section className="relative pt-32 pb-32 md:pt-48 md:pb-40 overflow-hidden">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-[1200px] px-6 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-12 items-center"
      >
        <div className="flex flex-col items-start text-left">
          <motion.div variants={item} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted mb-8 shadow-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-accent" />
            Live automated execution
          </motion.div>
          
          <motion.h1 variants={item} className="max-w-2xl text-balance text-5xl font-extrabold tracking-tight text-fg md:text-6xl lg:text-7xl leading-[1.05]">
            Trade smarter.<br />
            Zero code required.
          </motion.h1>
          
          <motion.p variants={item} className="mt-6 max-w-xl text-pretty text-lg text-fg-muted md:text-xl">
            A precise trading engine that automates your strategies while keeping you completely in control. Built for speed and absolute clarity.
          </motion.p>
          
          <motion.div variants={item} className="mt-10 flex flex-col sm:flex-row items-start gap-4 w-full sm:w-auto">
            <Button href={authUrl("/sign-up")} size="lg" className="rounded-[var(--radius-control)] w-full sm:w-auto h-12 px-6 text-[15px] font-semibold">
              Start building for free
            </Button>
            <Button href="#features" variant="secondary" size="lg" className="rounded-[var(--radius-control)] w-full sm:w-auto h-12 px-6 text-[15px] font-medium">
              Explore platform
            </Button>
          </motion.div>
        </div>

        {/* High fidelity static UI preview right column */}
        <motion.div variants={item} className="hidden md:flex relative w-full items-center justify-end">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent/10 blur-[80px] rounded-full pointer-events-none" />
           <div className="relative z-10 w-[400px] rounded-[var(--radius-card)] border border-line bg-base shadow-[var(--shadow-xl)] p-5 overflow-hidden flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-[8px] bg-accent-soft text-accent flex items-center justify-center font-bold font-mono text-xs">
                      FX
                   </div>
                   <div>
                     <p className="text-sm font-semibold text-fg leading-none">Active Session</p>
                     <p className="text-xs text-fg-subtle tnum mt-1">09:30 - 16:00 NY</p>
                   </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-pill)] bg-surface border border-line">
                   <span className="flex h-1.5 w-1.5 rounded-full bg-accent" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted">Running</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                 <p className="text-sm font-medium text-fg-muted">Today&apos;s P&amp;L</p>
                 <p className="text-xl font-semibold text-profit tnum">+$1,240.50</p>
              </div>
              <div className="flex justify-between items-baseline">
                 <p className="text-sm font-medium text-fg-muted">Win Rate</p>
                 <p className="text-sm font-semibold text-fg tnum">68.4%</p>
              </div>
              <div className="flex justify-between items-baseline">
                 <p className="text-sm font-medium text-fg-muted">Drawdown</p>
                 <p className="text-sm font-semibold text-fg tnum">0.8%</p>
              </div>
           </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
