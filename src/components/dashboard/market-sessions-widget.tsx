"use client";

import { useEffect, useState } from "react";
import { GlobeHemisphereWest, Clock } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Market = {
  id: string;
  name: string;
  tz: string;
  openHr: number;
  closeHr: number;
  x: number;
  y: number;
};

const MARKETS: Market[] = [
  { id: "syd", name: "Sydney", tz: "Australia/Sydney", openHr: 10, closeHr: 16, x: 31, y: 12 },
  { id: "tyo", name: "Tokyo", tz: "Asia/Tokyo", openHr: 9, closeHr: 15, x: 30, y: 4 },
  { id: "lon", name: "London", tz: "Europe/London", openHr: 8, closeHr: 16, x: 17, y: 4 },
  { id: "nyc", name: "New York", tz: "America/New_York", openHr: 9, closeHr: 16, x: 8, y: 4 },
];

const DOT_GRID = [[5,3],[5,4],[5,5],[5,6],[5,7],[6,3],[6,4],[6,5],[6,6],[6,7],[7,3],[7,4],[7,5],[7,6],[7,7],[8,3],[8,4],[8,5],[8,6],[8,7],[9,3],[9,4],[9,5],[9,6],[9,7],[10,5],[10,6],[10,7],[11,5],[11,6],[11,7],[9,9],[9,10],[9,11],[10,9],[10,10],[10,11],[10,12],[10,13],[10,14],[11,9],[11,10],[11,11],[11,12],[11,13],[11,14],[12,9],[12,10],[12,11],[12,12],[12,13],[12,14],[16,3],[16,4],[16,5],[17,3],[17,4],[17,5],[18,3],[18,4],[18,5],[19,3],[19,4],[19,5],[16,6],[16,7],[16,8],[16,9],[16,10],[16,11],[16,12],[17,6],[17,7],[17,8],[17,9],[17,10],[17,11],[17,12],[18,6],[18,7],[18,8],[18,9],[18,10],[18,11],[18,12],[19,6],[19,7],[19,8],[19,9],[19,10],[19,11],[19,12],[20,6],[20,7],[20,8],[20,9],[21,6],[21,7],[21,8],[21,9],[20,4],[20,5],[20,6],[20,7],[20,8],[21,4],[21,5],[21,6],[21,7],[21,8],[22,2],[22,3],[22,4],[22,5],[22,6],[22,7],[22,8],[23,2],[23,3],[23,4],[23,5],[23,6],[23,7],[23,8],[24,2],[24,3],[24,4],[24,5],[24,6],[24,7],[24,8],[25,2],[25,3],[25,4],[25,5],[25,6],[25,7],[25,8],[26,2],[26,3],[26,4],[26,5],[26,6],[26,7],[26,8],[27,2],[27,3],[27,4],[27,5],[27,6],[27,7],[27,8],[28,2],[28,3],[28,4],[28,5],[28,6],[29,2],[29,3],[29,4],[29,5],[29,6],[30,2],[30,3],[30,4],[30,5],[30,6],[28,11],[28,12],[28,13],[29,11],[29,12],[29,13],[30,11],[30,12],[30,13],[31,11],[31,12],[31,13]];

function getMarketStatus(m: Market, now: Date) {
  try {
    const localStr = new Intl.DateTimeFormat("en-US", {
      timeZone: m.tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      weekday: "short"
    }).format(now);
    
    const isWeekend = localStr.startsWith("Sat") || localStr.startsWith("Sun");
    if (isWeekend) return { status: "CLOSED", localTime: localStr.split(" ")[1] };

    const hourFormat = new Intl.DateTimeFormat("en-US", {
      timeZone: m.tz,
      hour: "numeric",
      hour12: false,
    });
    const hr = parseInt(hourFormat.format(now));
    
    const isOpen = hr >= m.openHr && hr < m.closeHr;
    
    return {
      status: isOpen ? "OPEN" : "CLOSED",
      localTime: localStr.split(" ")[1]
    };
  } catch (e) {
    return { status: "UNKNOWN", localTime: "--:--" };
  }
}

export function MarketSessionsWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [hoveredMarket, setHoveredMarket] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client clock seed; SSR renders null to stay hydration-safe
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="group flex h-full w-full flex-col bg-elevated text-fg overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-elevated/80 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <GlobeHemisphereWest size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Market Sessions</h3>
        </div>
      </div>
      
      {/* Map Background */}
      <div className="absolute inset-x-0 top-12 bottom-0 z-0 flex items-center justify-center opacity-30 pointer-events-none">
        <svg viewBox="0 0 36 18" className="w-[120%] h-auto fill-fg-subtle">
          {DOT_GRID.map(([x,y], i) => (
            <circle key={i} cx={x + 0.5} cy={y + 0.5} r={0.3} />
          ))}
          {/* Active nodes */}
          {now && MARKETS.map(m => {
            const { status } = getMarketStatus(m, now);
            const isOpen = status === "OPEN";
            return isOpen ? (
              <circle key={`active-${m.id}`} cx={m.x + 0.5} cy={m.y + 0.5} r={0.8} className="fill-profit animate-pulse" />
            ) : null;
          })}
        </svg>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end gap-3 z-10 relative">
        {MARKETS.map((m) => {
          const { status, localTime } = now ? getMarketStatus(m, now) : { status: "UNKNOWN", localTime: "--:--" };
          const isOpen = status === "OPEN";
          const isHovered = hoveredMarket === m.id;
          
          return (
            <div 
              key={m.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-[var(--radius-card)] transition-all border",
                isOpen ? "bg-surface border-line" : "bg-transparent border-transparent",
                isHovered ? "ring-1 ring-accent" : ""
              )}
              onMouseEnter={() => setHoveredMarket(m.id)}
              onMouseLeave={() => setHoveredMarket(null)}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-base">
                  <Clock size={16} className={isOpen ? "text-accent" : "text-fg-muted"} weight={isOpen ? "fill" : "regular"} />
                  {isOpen && (
                    <motion.div
                      className="absolute inset-0 rounded-full border border-accent"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">{m.name}</p>
                  <p className="text-[11px] text-fg-subtle flex items-center gap-1 mt-0.5">
                    <span className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full",
                      isOpen ? "bg-profit shadow-[0_0_8px_var(--color-profit)]" : "bg-fg-muted"
                    )} />
                    {isOpen ? "Trading" : "Closed"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="tnum text-base font-medium tracking-tight font-mono">{localTime}</p>
                <p className="text-[10px] text-fg-faint uppercase tracking-widest mt-0.5">{m.tz.split('/')[1]?.replace('_', ' ')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
