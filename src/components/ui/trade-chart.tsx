"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, createSeriesMarkers, type CandlestickData, type SeriesMarker, type Time } from "lightweight-charts";
import { useTheme } from "next-themes";

interface TradeChartProps {
  data: CandlestickData[];
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

    const upCol = "#10b981";
    const downCol = "#ef4444";
    const accentCol = "#10b981";

    const series = chart.addSeries(CandlestickSeries, {
      upColor: upCol, 
      downColor: downCol,
      borderVisible: false,
      wickUpColor: upCol,
      wickDownColor: downCol,
    });
    series.setData(data);

    // Add Markers for Entry/Exit
    const markers: SeriesMarker<Time>[] = [];
    if (entryTime && entryPrice) {
      markers.push({
        time: entryTime as Time,
        position: direction === "LONG" ? 'belowBar' : 'aboveBar',
        color: accentCol,
        shape: direction === "LONG" ? 'arrowUp' : 'arrowDown',
        text: `Entry @ ${entryPrice.toFixed(2)}`,
      });
    }

    if (exitTime && exitPrice) {
      const isWin = direction === "LONG" ? exitPrice > (entryPrice || 0) : exitPrice < (entryPrice || 0);
      markers.push({
        time: exitTime as Time,
        position: direction === "LONG" ? 'aboveBar' : 'belowBar',
        color: isWin ? upCol : downCol,
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
