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
      {/* Grid Pattern with Edge Fade */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)', 
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)'
        }} 
      />

      {/* Breathable Aurora Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-emerald-400/20 aurora rounded-full mix-blend-multiply pointer-events-none -translate-y-1/4 translate-x-1/4 z-0" />
      <div className="absolute top-40 left-0 w-[600px] h-[600px] bg-teal-400/20 aurora rounded-full mix-blend-multiply pointer-events-none translate-y-1/4 -translate-x-1/4 z-0" style={{ animationDelay: '-7s' }} />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-[1200px] px-6 text-center flex flex-col items-center"
      >
        <motion.div variants={item} className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent mb-8 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
          Live automated execution
        </motion.div>
        
        <motion.h1 variants={item} className="max-w-4xl text-balance text-5xl font-extrabold tracking-tight text-fg md:text-7xl leading-[1.05]">
          Trade smarter. <br className="hidden md:block" />
          <span className="text-fg">
            Zero code required.
          </span>
        </motion.h1>
        
        <motion.p variants={item} className="mt-6 max-w-xl text-pretty text-lg text-fg-muted md:text-xl">
          A precise trading engine that automates your strategies while keeping you completely in control. Built for speed and absolute clarity.
        </motion.p>
        
        <motion.div variants={item} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Button href={authUrl("/sign-up")} size="lg" className="rounded-full w-full sm:w-auto h-14 px-8 text-[16px] shadow-lg shadow-accent/20 font-semibold tracking-wide">
            Start building for free
          </Button>
          <Button href="#features" variant="secondary" size="lg" className="rounded-full w-full sm:w-auto h-14 px-8 text-[16px] bg-white border border-line shadow-sm transition-all hover:bg-surface text-fg font-medium tracking-wide">
            Explore platform
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
