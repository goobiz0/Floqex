"use client";

import { motion } from "motion/react";

export function HeroInteractiveBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Fading Edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-base via-transparent to-base" />
      <div className="absolute inset-0 bg-gradient-to-r from-base via-transparent to-base" />

      {/* Subtle moving highlights (not blobs, but structured sweeps) */}
      <motion.div
        animate={{
          x: ["-100%", "200%"],
        }}
        transition={{
          duration: 15,
          ease: "linear",
          repeat: Infinity,
        }}
        className="absolute top-1/4 left-0 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent"
      />
      
      <motion.div
        animate={{
          y: ["-100%", "200%"],
        }}
        transition={{
          duration: 20,
          ease: "linear",
          repeat: Infinity,
          delay: 5,
        }}
        className="absolute top-0 right-[20%] w-[1px] h-1/2 bg-gradient-to-b from-transparent via-accent/30 to-transparent"
      />

      {/* Central subtle glow just to lift the text off the background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 blur-[100px] rounded-[100%]" />
    </div>
  );
}
