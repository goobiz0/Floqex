"use client";

import { useEffect, useRef, useState } from "react";
import { WifiHigh } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Ping = { id: number; val: number };

// Measures a real client to Floqex API round trip on an interval and charts it.
// No simulated numbers: each bar is an actual fetch timing in milliseconds.
export function NetworkLatencyWidget({ interval = "1s" }: { interval?: string }) {
  const [pings, setPings] = useState<Ping[]>([]);
  const [currentPing, setCurrentPing] = useState<number | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    let ms = 1000;
    if (interval === "500ms") ms = 500;
    if (interval === "5s") ms = 5000;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Sequential polling: each probe completes before the next is scheduled, so
    // slow responses never overlap or race the chart. Each probe has a deadline,
    // and a non-OK response counts as a failure rather than healthy latency.
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
        // A failed or timed-out probe is a real signal too: surface it.
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

  const maxVal = 300; // ms ceiling for chart scaling
  const ping = currentPing ?? 0;

  let statusColor = "text-profit";
  let statusDot = "bg-profit";
  if (ping > 120) { statusColor = "text-warning"; statusDot = "bg-warning"; }
  if (ping > 250 || currentPing === null) { statusColor = "text-negative"; statusDot = "bg-negative"; }

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <WifiHigh size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">API Latency</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", statusColor, statusDot)} />
          <span className={cn("font-mono text-xs font-medium", statusColor)}>
            {currentPing === null ? "timeout" : `${currentPing}ms`}
          </span>
        </div>
      </div>

      <div className="group relative flex flex-1 flex-col justify-end overflow-hidden p-4">
        <div className="absolute left-4 right-4 top-4 flex justify-between font-mono text-[10px] uppercase text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100">
          <span>Floqex API</span>
          <span>{interval} refresh</span>
        </div>

        <div className="flex h-24 w-full items-end gap-[2px]">
          {pings.map((p) => {
            const hPct = Math.min(100, Math.max(5, (p.val / maxVal) * 100));
            let barColor = "bg-profit/40";
            if (p.val > 120) barColor = "bg-warning/60";
            if (p.val > 250) barColor = "bg-negative/80";
            return (
              <motion.div
                key={p.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${hPct}%`, opacity: 1 }}
                className={cn("flex-1 rounded-t-sm transition-colors", barColor)}
              />
            );
          })}
        </div>

        <div className="relative mt-1 h-px w-full bg-line">
          <span className="absolute -bottom-3 -left-1 text-[9px] text-fg-faint">Now</span>
        </div>
      </div>
    </div>
  );
}
