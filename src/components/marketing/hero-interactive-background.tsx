/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { motion } from "motion/react";
import { NoiseOverlay } from "@/components/ui/noise-overlay";
import { useMousePosition } from "@/hooks/use-mouse-position";

export function HeroInteractiveBackground() {
  const mousePos = useMousePosition();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <NoiseOverlay />
      {/* Structural Grain */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 overflow-hidden mix-blend-multiply opacity-50">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(var(--color-line) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none blur-[100px] opacity-80 mix-blend-screen">
        <motion.div
          animate={{ x: mousePos.x * 0.05, y: mousePos.y * 0.05 }}
          className="absolute -top-[30%] left-[10%] w-[800px] h-[600px] rounded-full bg-emerald-400/40 blur-[120px]"
          transition={{
            type: "spring",
            damping: 40,
            stiffness: 50,
          }}
        />
        
        {/* Subtle Brand Accent Overlay (Blue/Purple side) */}
        <motion.div
          animate={{ x: mousePos.x * -0.02, y: mousePos.y * -0.02 }}
          className="absolute top-[10%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[#60a5fa]/40 blur-[120px]"
          transition={{
            type: "spring",
            damping: 50,
            stiffness: 40,
          }}
        />
        
        {/* Deep emerald shadow for depth */}
        <motion.div
          animate={{ x: mousePos.x * 0.01, y: mousePos.y * 0.01 }}
          className="absolute bottom-[-20%] left-[30%] w-[900px] h-[500px] rounded-full bg-[#10b981]/30 blur-[150px]"
          transition={{
            type: "spring",
            damping: 60,
            stiffness: 30,
          }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-base/50 via-transparent to-base" />
      <div className="absolute inset-0 bg-gradient-to-r from-base/80 via-transparent to-base/80" />
    </div>
  );
}
