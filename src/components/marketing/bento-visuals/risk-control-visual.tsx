"use client";

import { motion } from "motion/react";

export function RiskControlVisual() {
  return (
    <div className="absolute inset-y-0 right-0 w-1/2 md:w-3/5 overflow-hidden pointer-events-none flex items-center justify-end pr-10 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
      <div className="relative w-48 h-6 bg-line/50 rounded-full overflow-hidden border border-line-strong">
        {/* Target limit line */}
        <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-negative z-20" />
        
        {/* Progress Bar */}
        <motion.div 
          className="h-full bg-emerald-500 relative z-10"
          initial={{ width: "20%" }}
          animate={{ width: ["20%", "80%", "80%", "20%"] }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
        >
          {/* Flash at limit */}
          <motion.div 
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.8, 0, 0] }}
            transition={{ duration: 4, times: [0, 0.45, 0.5, 0.55, 1], repeat: Infinity }}
          />
        </motion.div>
      </div>
    </div>
  );
}
