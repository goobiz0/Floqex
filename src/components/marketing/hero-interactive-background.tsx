"use client";

import { motion } from "motion/react";

export function HeroInteractiveBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base Grid */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
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

      {/* Central subtle glow just to lift the text off the background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 blur-[120px] rounded-[100%]" />
    </div>
  );
}
