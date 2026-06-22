"use client";

import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { Card } from "@/components/ui/card";
import { ReactNode, MouseEvent } from "react";

export function BentoCard({ 
  children, 
  className,
  innerClassName
}: { 
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[32px] opacity-0 transition duration-300 group-hover:opacity-100 z-10"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.1),
              transparent 80%
            )
          `,
        }}
      />
      <Card className={`h-full w-full relative overflow-hidden flex flex-col rounded-[32px] ${innerClassName || 'bg-base border-line p-8'}`}>
        {children}
      </Card>
    </motion.div>
  );
}
