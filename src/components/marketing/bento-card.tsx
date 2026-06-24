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
      <Card className={`h-full w-full relative overflow-hidden flex flex-col rounded-[32px] bg-white/80 backdrop-blur-md ring-1 ring-line shadow-sm ${innerClassName || 'p-8'}`}>
        {children}
      </Card>
    </div>
  );
}
