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
      <Card className={`relative h-full w-full overflow-hidden flex flex-col ${innerClassName || 'p-8'}`}>
        {children}
      </Card>
    </div>
  );
}
