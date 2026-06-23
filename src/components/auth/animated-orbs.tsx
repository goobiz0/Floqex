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
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80 mix-blend-multiply z-0">
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
        className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-400/80 to-purple-400/80 blur-[80px]"
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
        className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tl from-emerald-300/80 to-teal-200/80 blur-[100px]"
      />
      {/* Heavy Glass Overlay to frost the blobs */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[80px]" />
    </div>
  );
}
