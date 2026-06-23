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
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`group relative ${className}`}
    >
      <Card className={`h-full w-full relative overflow-hidden flex flex-col rounded-[32px] bg-white/80 backdrop-blur-md ring-1 ring-line shadow-sm hover:shadow-xl hover:shadow-accent/5 transition-all duration-500 ease-out ${innerClassName || 'p-8'}`}>
        {children}
      </Card>
    </motion.div>
  );
}
