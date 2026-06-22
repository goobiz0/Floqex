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
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 mix-blend-screen">
        <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-accent blur-[120px]" />
        <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-500 blur-[100px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 mix-blend-screen">
      <motion.div
        animate={{
          x: ["0%", "10%", "-5%", "0%"],
          y: ["0%", "5%", "-10%", "0%"],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 15,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-accent blur-[120px]"
      />
      <motion.div
        animate={{
          x: ["0%", "-10%", "5%", "0%"],
          y: ["0%", "-5%", "10%", "0%"],
          scale: [1, 0.95, 1.05, 1],
        }}
        transition={{
          duration: 20,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        className="absolute top-[40%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-500 blur-[100px]"
      />
      <motion.div
        animate={{
          x: ["0%", "5%", "-5%", "0%"],
          y: ["0%", "10%", "-5%", "0%"],
        }}
        transition={{
          duration: 25,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        className="absolute bottom-[-10%] left-[20%] w-[600px] h-[300px] rounded-full bg-emerald-300 blur-[150px] opacity-50"
      />
    </div>
  );
}
