"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { useTheme } from "next-themes";

interface TradeChartProps {
  data: { time: string | number; open: number; high: number; low: number; close: number }[];
  entryTime?: string;
  entryPrice?: number;
  exitTime?: string;
  exitPrice?: number;
  direction?: "LONG" | "SHORT";
}

export function TradeChart({ data, entryTime, entryPrice, exitTime, exitPrice, direction }: TradeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDark = resolvedTheme === "dark";
    
    // Theme colors reflecting DESIGN.md "Soft Instrument, Light" standard
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#121212" : "#FFFFFF" },
        textColor: isDark ? "#A0A0A0" : "#505050",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" },
        horzLines: { color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "var(--color-profit)", 
      downColor: "var(--color-negative)",
      borderVisible: false,
      wickUpColor: "var(--color-profit)",
      wickDownColor: "var(--color-negative)",
    });
    series.setData(data as any);
    
    // Add Markers for Entry/Exit
    type MarkerParams = any;
    const markers: MarkerParams[] = [];
    if (entryTime && entryPrice) {
      markers.push({
        time: entryTime as any,
        position: direction === "LONG" ? 'belowBar' : 'aboveBar',
        color: 'var(--color-accent)',
        shape: direction === "LONG" ? 'arrowUp' : 'arrowDown',
        text: `Entry @ ${entryPrice.toFixed(2)}`,
      });
    }

    if (exitTime && exitPrice) {
      const isWin = direction === "LONG" ? exitPrice > (entryPrice || 0) : exitPrice < (entryPrice || 0);
      markers.push({
        time: exitTime as any,
        position: direction === "LONG" ? 'aboveBar' : 'belowBar',
        color: isWin ? 'var(--color-profit)' : 'var(--color-negative)',
        shape: 'circle',
        text: `Exit @ ${exitPrice.toFixed(2)}`,
      });
    }

    if (markers.length > 0) {
      createSeriesMarkers(series as ISeriesApi<"Candlestick">, markers.sort((a, b) => (new Date(a.time as string).getTime()) - (new Date(b.time as string).getTime())));
    }

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, resolvedTheme, entryTime, entryPrice, exitTime, exitPrice, direction]);

  return <div ref={chartContainerRef} className="w-full rounded-[var(--radius-card)] overflow-hidden border border-line" />;
}
