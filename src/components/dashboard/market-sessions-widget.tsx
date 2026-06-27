"use client";

import { useEffect, useState } from "react";
import { GlobeHemisphereWest, Clock } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type Market = {
  id: string;
  name: string;
  tz: string;
  openHr: number;
  closeHr: number;
};

const MARKETS: Market[] = [
  { id: "syd", name: "Sydney", tz: "Australia/Sydney", openHr: 10, closeHr: 16 },
  { id: "tyo", name: "Tokyo", tz: "Asia/Tokyo", openHr: 9, closeHr: 15 },
  { id: "lon", name: "London", tz: "Europe/London", openHr: 8, closeHr: 16 },
  { id: "nyc", name: "New York", tz: "America/New_York", openHr: 9, closeHr: 16 }, // Note: NYSE is 9:30 to 16:00, simplified here
];

function getMarketStatus(m: Market, now: Date) {
  try {
    const localStr = new Intl.DateTimeFormat("en-US", {
      timeZone: m.tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      weekday: "short"
    }).format(now);
    
    // Check if weekend
    const isWeekend = localStr.startsWith("Sat") || localStr.startsWith("Sun");
    if (isWeekend) return { status: "CLOSED", localTime: localStr.split(" ")[1] };

    // Get exact hour
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

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 10000); // update every 10s
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <GlobeHemisphereWest size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Market Sessions</h3>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center gap-4">
        {MARKETS.map((m) => {
          const { status, localTime } = now ? getMarketStatus(m, now) : { status: "UNKNOWN", localTime: "--:--" };
          const isOpen = status === "OPEN";
          
          return (
            <div key={m.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-surface">
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
