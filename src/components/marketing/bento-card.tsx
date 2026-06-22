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
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
    >
      <Card className={`h-full w-full relative overflow-hidden flex flex-col rounded-[32px] ${innerClassName || 'bg-base border-line p-8'}`}>
        {children}
      </Card>
    </motion.div>
  );
}
