"use client";

import { motion } from "motion/react";

export function StrategyLabVisual() {
  return (
    <div className="absolute inset-x-0 top-0 h-[200px] pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity duration-700 flex items-start justify-center pt-8">
      <svg width="200" height="100" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Connections */}
        <motion.path 
          d="M40 50 L100 20 M40 50 L100 80 M100 20 L160 50 M100 80 L160 50" 
          stroke="#3b82f6" 
          strokeWidth="1.5"
          strokeOpacity="0.5"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
        />
        
        {/* Nodes */}
        <motion.circle cx="40" cy="50" r="6" fill="white" stroke="#3b82f6" strokeWidth="2" />
        <motion.circle cx="100" cy="20" r="8" fill="white" stroke="#3b82f6" strokeWidth="2" />
        <motion.circle cx="100" cy="80" r="6" fill="white" stroke="#3b82f6" strokeWidth="2" />
        <motion.circle cx="160" cy="50" r="10" fill="#3b82f6" filter="drop-shadow(0 0 6px rgba(59,130,246,0.5))" />
        
        {/* Pulses on Nodes */}
        <motion.circle 
          cx="160" cy="50" r="10" 
          fill="none" 
          stroke="#3b82f6" 
          strokeWidth="2"
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", repeat: Infinity, repeatDelay: 0.5 }}
        />
      </svg>
    </div>
  );
}
