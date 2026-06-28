"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { WifiHigh } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { WidgetShell } from "./widget-kit";

type Ping = { id: number; val: number };

// Measures a real client to Floqex API round trip on an interval and charts it.
// No simulated numbers: each bar is an actual fetch timing in milliseconds.
export function NetworkLatencyWidget({ interval = "1s" }: { interval?: string }) {
  const [pings, setPings] = useState<Ping[]>([]);
  // undefined = no probe yet (measuring), null = a failed/timed-out probe.
  const [currentPing, setCurrentPing] = useState<number | null | undefined>(undefined);
  const [hoveredPing, setHoveredPing] = useState<Ping | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    let ms = 1000;
    if (interval === "500ms") ms = 500;
    if (interval === "5s") ms = 5000;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function measure() {
      const start = performance.now();
      const ctrl = new AbortController();
      const deadline = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch("/api/ping", { cache: "no-store", signal: ctrl.signal });
        if (cancelled) return;
        if (!res.ok) throw new Error(`status ${res.status}`);
        const val = Math.round(performance.now() - start);
        setCurrentPing(val);
        setPings((prev) => {
          const next = [...prev, { id: idRef.current++, val }];
          return next.length > 40 ? next.slice(next.length - 40) : next;
        });
      } catch {
        if (cancelled) return;
        setCurrentPing(null);
      } finally {
        clearTimeout(deadline);
        if (!cancelled) timer = setTimeout(measure, ms);
      }
    }

    measure();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [interval]);

  const measuring = currentPing === undefined;
  const ping = currentPing ?? 0;

  let statusColor = "text-fg-subtle";
  let statusDot = "bg-fg-subtle";
  if (currentPing === null) {
    statusColor = "text-negative"; statusDot = "bg-negative";
  } else if (currentPing !== undefined) {
    statusColor = "text-profit"; statusDot = "bg-profit";
    if (ping > 120) { statusColor = "text-warning"; statusDot = "bg-warning"; }
    if (ping > 250) { statusColor = "text-negative"; statusDot = "bg-negative"; }
  }

  // Dynamic scale calculation based on highest ping in window (min 100ms)
  const maxVal = useMemo(() => {
    if (pings.length === 0) return 100;
    const highest = Math.max(...pings.map((p) => p.val));
    return Math.max(100, Math.ceil(highest / 50) * 50); // Snap to nearest 50ms
  }, [pings]);

  return (
    <WidgetShell 
      title="API Latency" 
      icon={<WifiHigh size={16} weight="duotone" />}
      right={
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]", statusColor, statusDot)} />
          <span className={cn("font-mono text-xs font-medium", statusColor)}>
            {hoveredPing ? `${hoveredPing.val}ms` : measuring ? "…" : currentPing === null ? "timeout" : `${currentPing}ms`}
          </span>
        </div>
      }
    >
      <div className="group relative flex h-full flex-col justify-end overflow-hidden px-4 pb-4 pt-2">
        <div className="absolute left-4 right-4 top-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-fg-subtle opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100">
          <span>Floqex Edge API</span>
          <span>{maxVal}ms ceiling</span>
        </div>

        <div 
          className="flex flex-1 w-full items-end gap-[3px] pt-6"
          onMouseLeave={() => setHoveredPing(null)}
        >
          {pings.map((p) => {
            const hPct = Math.min(100, Math.max(2, (p.val / maxVal) * 100));
            let barColor = "bg-profit/40 hover:bg-profit";
            if (p.val > 120) barColor = "bg-warning/60 hover:bg-warning";
            if (p.val > 250) barColor = "bg-negative/80 hover:bg-negative";
            
            const isHovered = hoveredPing?.id === p.id;
            
            return (
              <motion.div
                key={p.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${hPct}%`, opacity: 1 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                onMouseEnter={() => setHoveredPing(p)}
                className={cn(
                  "flex-1 rounded-t-sm transition-all duration-200 cursor-crosshair min-h-[4px]", 
                  barColor,
                  isHovered ? "opacity-100" : "opacity-80 group-hover:opacity-40"
                )}
              />
            );
          })}
        </div>

        <div className="relative mt-2 h-px w-full bg-line">
          <span className="absolute -bottom-4 -right-1 text-[9px] font-mono text-fg-faint">Now</span>
        </div>
      </div>
    </WidgetShell>
  );
}
