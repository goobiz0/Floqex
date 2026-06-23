"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

export function AnimatedOrbs() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 mix-blend-multiply">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-300 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-emerald-300 blur-[120px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50 z-0">
      <div className="absolute inset-0 mix-blend-multiply">
        <motion.div
          animate={{
            x: ["0%", "15%", "-5%", "0%"],
            y: ["0%", "10%", "-15%", "0%"],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 20,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-indigo-400/70 to-purple-400/70 blur-[80px]"
        />
        <motion.div
          animate={{
            x: ["0%", "-15%", "10%", "0%"],
            y: ["0%", "-10%", "15%", "0%"],
            scale: [1, 0.9, 1.05, 1],
          }}
          transition={{
            duration: 25,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="absolute bottom-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full bg-gradient-to-tl from-emerald-300/70 to-teal-200/70 blur-[90px]"
        />
      </div>
      {/* Heavy Glass Overlay to frost the blobs */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[60px]" />
      
      {/* Embedded SVG Noise Filter for pure organic grain */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15] mix-blend-overlay">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
  );
}
