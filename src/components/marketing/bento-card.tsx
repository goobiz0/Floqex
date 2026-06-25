"use client";


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
    <div className={`group relative ${className}`}>
      <Card className={`h-full w-full relative overflow-hidden flex flex-col rounded-[var(--radius-card)] bg-elevated border border-line ${innerClassName || 'p-8'}`}>
        {children}
      </Card>
    </div>
  );
}
