"use client";

import { motion } from "motion/react";

export function InfrastructureVisual() {
  return (
    <div className="absolute inset-y-0 right-0 w-1/2 md:w-3/5 overflow-hidden pointer-events-none flex items-center justify-end pr-10 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
      <svg width="240" height="120" viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M20 60 L80 60 L100 20 L140 100 L160 60 L220 60" 
          stroke="var(--color-line-strong)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Animated Line */}
        <motion.path 
          d="M20 60 L80 60 L100 20 L140 100 L160 60 L220 60" 
          stroke="#10b981" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 },
            opacity: { duration: 0.2 }
          }}
        />

        {/* Glowing Data Packet */}
        <motion.circle 
          r="4" 
          fill="#10b981" 
          filter="drop-shadow(0 0 4px #10b981)"
          initial={{ offsetDistance: "0%" } as any}
          animate={{ offsetDistance: "100%" } as any}
          transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
          style={{ offsetPath: "path('M20 60 L80 60 L100 20 L140 100 L160 60 L220 60')" } as any}
        />
      </svg>
    </div>
  );
}
