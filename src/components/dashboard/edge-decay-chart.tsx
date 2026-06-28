"use client";

import { memo, useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, AreaSeries, LineSeries, type Time } from "lightweight-charts";
import { useTheme } from "next-themes";

interface EdgeDecayChartProps {
  data: number[]; // array of historical equity values or win rates
}

function EdgeDecayChartBase({ data }: EdgeDecayChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const isDark = resolvedTheme === "dark";
    
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#A0A0A0" : "#505050",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" },
      },
      timeScale: {
        visible: false, // Hide time scale for sparkline feel
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 120,
    });

    const profitColor = "#10b981";
    const baselineColor = "#fbbf24"; // warning/yellow

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: profitColor,
      topColor: isDark ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.2)",
      bottomColor: "rgba(16, 185, 129, 0)",
      lineWidth: 2,
    });

    // We don't have actual timestamps for the spark data, so we fabricate sequential timestamps
    const baseTime = new Date("2020-01-01").getTime();
    const formattedData = data.map((val, idx) => ({
      time: ((baseTime + idx * 86400000) / 1000) as Time,
      value: val,
    }));

    areaSeries.setData(formattedData);

    // Calculate a simple rolling baseline (e.g. SMA) to demonstrate edge decay correlation
    const baselineData = [];
    let sum = 0;
    const windowSize = Math.max(2, Math.floor(data.length / 3));
    
    for (let i = 0; i < formattedData.length; i++) {
       sum += formattedData[i].value;
       if (i >= windowSize) {
         sum -= formattedData[i - windowSize].value;
         baselineData.push({ time: formattedData[i].time, value: sum / windowSize });
       } else {
         baselineData.push({ time: formattedData[i].time, value: sum / (i + 1) });
       }
    }

    const baselineSeries = chart.addSeries(LineSeries, {
      color: baselineColor,
      lineWidth: 1,
      lineStyle: 2, // Dashed
    });
    baselineSeries.setData(baselineData);

    chartRef.current = chart;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, resolvedTheme]);

  if (data.length === 0) {
    return <div className="h-[120px] w-full flex items-center justify-center text-xs text-fg-subtle">No performance data yet</div>;
  }

  return (
    <div className="w-full relative">
       <div className="absolute top-2 left-2 z-10 text-[10px] text-fg-muted font-medium flex items-center gap-4">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-profit"></div> Equity Curve</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning"></div> Baseline Trend</span>
       </div>
       <div ref={chartContainerRef} className="w-full h-[120px]" />
    </div>
  );
}

// Memoized: creating a lightweight-charts instance is expensive, so skip
// re-renders unless the underlying data changes.
export const EdgeDecayChart = memo(EdgeDecayChartBase);
