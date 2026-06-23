/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { motion } from "motion/react";
import { NoiseOverlay } from "@/components/ui/noise-overlay";

export function HeroInteractiveBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <NoiseOverlay />
      {/* Base Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Dynamic Aurora Gradients */}
      <div className="absolute inset-0 overflow-hidden mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-40">
        <motion.div
          animate={{
            x: ["0%", "15%", "-5%", "0%"],
            y: ["0%", "5%", "-15%", "0%"],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 20,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="absolute -top-[30%] left-[10%] w-[800px] h-[600px] rounded-full bg-emerald-400/40 dark:bg-emerald-600/30 blur-[120px]"
        />
        <motion.div
          animate={{
            x: ["0%", "-10%", "10%", "0%"],
            y: ["0%", "15%", "5%", "0%"],
            scale: [1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: 25,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="absolute top-[10%] -right-[10%] w-[600px] h-[600px] rounded-full bg-cobalt/40 dark:bg-cobalt/30 blur-[120px]"
          style={{ backgroundColor: 'rgba(56, 189, 248, 0.4)' }} /* Fallback for cobalt/sky */
        />
        <motion.div
          animate={{
            x: ["0%", "5%", "-10%", "0%"],
            y: ["0%", "-10%", "5%", "0%"],
          }}
          transition={{
            duration: 30,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="absolute bottom-[-20%] left-[30%] w-[900px] h-[500px] rounded-full bg-teal-300/30 dark:bg-teal-700/20 blur-[150px]"
        />
      </div>

      {/* Fading Edges to blend with the canvas */}
      <div className="absolute inset-0 bg-gradient-to-b from-base/50 via-transparent to-base" />
      <div className="absolute inset-0 bg-gradient-to-r from-base/80 via-transparent to-base/80" />
    </div>
  );
}
