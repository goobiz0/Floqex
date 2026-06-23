"use client";

import { motion, useReducedMotion } from "motion/react";

export function VibrantMesh() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-base">
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "150px 150px",
        }}
      />
      
      {/* Light Emerald Mesh */}
      <motion.div
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full mix-blend-multiply opacity-[0.25] blur-[80px] bg-emerald-400"
        animate={reduceMotion ? {} : {
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Light Blue Mesh */}
      <motion.div
        className="absolute top-[10%] right-[0%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full mix-blend-multiply opacity-[0.20] blur-[80px] bg-blue-400"
        animate={reduceMotion ? {} : {
          x: [0, -40, 20, 0],
          y: [0, 30, -30, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Light Purple Mesh */}
      <motion.div
        className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full mix-blend-multiply opacity-[0.15] blur-[100px] bg-purple-400"
        animate={reduceMotion ? {} : {
          x: [0, 50, -50, 0],
          y: [0, 20, -40, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </div>
  );
}
