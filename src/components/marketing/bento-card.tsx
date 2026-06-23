"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

export function BentoCard({ 
  children, 
  className,
  innerClassName
}: { 
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative ${className}`}
    >
      <Card className={`h-full w-full relative overflow-hidden flex flex-col rounded-[32px] ring-1 ring-black/5 hover:ring-accent/50 backdrop-blur-md transition-shadow duration-300 ${innerClassName || 'bg-base/80 p-8'}`}>
        {children}
      </Card>
    </motion.div>
  );
}
