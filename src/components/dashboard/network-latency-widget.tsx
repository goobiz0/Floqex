"use client";

import { useEffect, useState } from "react";
import { WifiHigh } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Ping = { id: string; val: number };

export function NetworkLatencyWidget({ interval = "1s" }: { interval?: string }) {
  const [pings, setPings] = useState<Ping[]>([]);
  const [currentPing, setCurrentPing] = useState(0);

  useEffect(() => {
    // Determine interval in ms
    let ms = 1000;
    if (interval === "500ms") ms = 500;
    if (interval === "5s") ms = 5000;

    const timer = setInterval(() => {
      // Simulate a realistic ping (base 20ms, spikes up to 150ms occasionally)
      const isSpike = Math.random() > 0.9;
      const val = Math.floor(20 + Math.random() * 30 + (isSpike ? Math.random() * 100 : 0));
      
      setCurrentPing(val);
      setPings((prev) => {
        const next = [...prev, { id: Math.random().toString(), val }];
        // Keep last 40 pings for the chart
        if (next.length > 40) return next.slice(next.length - 40);
        return next;
      });
    }, ms);

    return () => clearInterval(timer);
  }, [interval]);

  const maxVal = 200; // Fixed max for chart scaling
  
  let statusColor = "text-profit";
  let statusDot = "bg-profit";
  if (currentPing > 80) { statusColor = "text-warning"; statusDot = "bg-warning"; }
  if (currentPing > 150) { statusColor = "text-negative"; statusDot = "bg-negative"; }

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <WifiHigh size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Network Ping</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", statusColor, statusDot)} />
          <span className={cn("text-xs font-mono font-medium", statusColor)}>{currentPing}ms</span>
        </div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col justify-end overflow-hidden relative group">
        <div className="absolute top-4 left-4 right-4 flex justify-between text-[10px] text-fg-subtle font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Broker API</span>
          <span>{interval} refresh</span>
        </div>
        
        <div className="flex items-end gap-[2px] h-24 w-full">
          {pings.map((ping) => {
            const hPct = Math.min(100, Math.max(5, (ping.val / maxVal) * 100));
            let barColor = "bg-profit/40";
            if (ping.val > 80) barColor = "bg-warning/60";
            if (ping.val > 150) barColor = "bg-negative/80";
            
            return (
              <motion.div
                key={ping.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${hPct}%`, opacity: 1 }}
                className={cn("flex-1 rounded-t-sm transition-colors", barColor)}
              />
            );
          })}
        </div>
        
        <div className="w-full h-px bg-line mt-1 relative">
          <span className="absolute -left-1 -bottom-3 text-[9px] text-fg-faint">Now</span>
        </div>
      </div>
    </div>
  );
}
