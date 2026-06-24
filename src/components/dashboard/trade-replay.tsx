"use client";

import { useEffect, useState, useRef } from "react";
import { TradeRow } from "@/lib/metrics";
import { Play, Pause, FastForward } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type TapeEvent = {
  id: string;
  timeOffset: number; // ms from start
  type: "INFO" | "EXECUTION" | "RISK";
  message: string;
  price?: number;
};

function generateMockTape(trade: TradeRow): TapeEvent[] {
  const events: TapeEvent[] = [];
  events.push({ id: "1", timeOffset: 0, type: "INFO", message: "Algo identified ORB setup." });
  events.push({ id: "2", timeOffset: 500, type: "EXECUTION", message: `Market order SENT [${trade.direction}]` });
  events.push({ id: "3", timeOffset: 1200, type: "EXECUTION", message: "Order FILLED", price: trade.entryPrice });
  events.push({ id: "4", timeOffset: 1500, type: "RISK", message: "Initial stop loss set", price: trade.stopPrice });
  
  if (trade.status === "CLOSED" && trade.exitPrice) {
    const isWin = (trade.netPnl ?? 0) > 0;
    events.push({ id: "5", timeOffset: 3500, type: "INFO", message: isWin ? "Price moving in favor, trailing stop." : "Price moving against position." });
    if (isWin) {
      events.push({ id: "6", timeOffset: 4800, type: "RISK", message: "Stop loss moved to breakeven" });
      events.push({ id: "7", timeOffset: 6500, type: "RISK", message: "Trailing stop activated" });
    }
    events.push({ id: "8", timeOffset: 8000, type: "EXECUTION", message: "Position CLOSED", price: trade.exitPrice });
  }
  
  return events;
}

export function TradeReplay({ trade }: { trade: TradeRow }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [events, setEvents] = useState<TapeEvent[]>([]);
  const [visibleEvents, setVisibleEvents] = useState<TapeEvent[]>([]);
  const [progress, setProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  useEffect(() => {
    // Reset when trade changes
    const generated = generateMockTape(trade);
    setEvents(generated);
    setVisibleEvents([]);
    setIsPlaying(false);
    setProgress(0);
    setSpeed(1);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [trade]);

  const totalDuration = events.length > 0 ? events[events.length - 1].timeOffset + 500 : 0;

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      pauseTimeRef.current = progress;
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (progress >= totalDuration) {
        // Restart
        setVisibleEvents([]);
        setProgress(0);
        pauseTimeRef.current = 0;
      }
      setIsPlaying(true);
      startTimeRef.current = Date.now() - pauseTimeRef.current;
      
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) * speed;
        setProgress(elapsed);
        
        setVisibleEvents(events.filter(e => e.timeOffset <= elapsed));
        
        if (elapsed >= totalDuration) {
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 50);
    }
  };

  const toggleSpeed = () => {
    setSpeed(s => s === 1 ? 2 : s === 2 ? 5 : 1);
  };

  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-base overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent transition-colors hover:bg-accent/20"
          >
            {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
          </button>
          <button
            onClick={toggleSpeed}
            className="flex h-7 items-center justify-center rounded-full border border-line bg-base px-2 text-[10px] font-medium text-fg-subtle transition-colors hover:text-fg"
          >
            {speed}x
          </button>
        </div>
        <div className="text-[10px] font-mono text-fg-subtle">
          TAPE VIEWER
        </div>
      </div>
      
      {/* Tape Output */}
      <div className="relative h-[200px] bg-black p-3 overflow-y-auto flex flex-col justify-end font-mono text-[11px]">
        <div className="space-y-1">
          {visibleEvents.map(ev => (
            <div key={ev.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-fg-faint w-10 shrink-0">
                {(ev.timeOffset / 1000).toFixed(1)}s
              </span>
              <span className={cn(
                "w-16 shrink-0",
                ev.type === "EXECUTION" ? "text-accent" : ev.type === "RISK" ? "text-orange-400" : "text-blue-400"
              )}>
                [{ev.type}]
              </span>
              <span className="text-white/80">
                {ev.message}
              </span>
              {ev.price && (
                <span className="text-emerald-400 ml-auto">
                  @{ev.price.toLocaleString()}
                </span>
              )}
            </div>
          ))}
          {visibleEvents.length === 0 && (
            <div className="text-fg-faint italic text-center w-full py-4">Press play to replay trade execution...</div>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1 w-full bg-line">
        <div 
          className="h-full bg-accent transition-all duration-75"
          style={{ width: `${Math.min(100, (progress / totalDuration) * 100)}%` }}
        />
      </div>
    </div>
  );
}
