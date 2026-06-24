"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { formatUSD } from "@/lib/utils";

interface AssetPnlChartProps {
  data: [string, number][]; // [instrument, pnl]
}

export function AssetPnlChart({ data }: AssetPnlChartProps) {
  const chartData = useMemo(() => {
    return data.map(([instrument, pnl]) => ({
      instrument,
      pnl,
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          barCategoryGap="20%"
        >
          <XAxis 
            dataKey="instrument" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-fg-subtle)' }}
            dy={10}
          />
          <YAxis 
            hide
            domain={['auto', 'auto']}
          />
          <Tooltip 
            cursor={{ fill: 'var(--color-surface)', opacity: 0.5 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const isProfit = data.pnl >= 0;
                return (
                  <div className="rounded-[var(--radius-card)] border border-line bg-elevated/90 backdrop-blur-md p-3 shadow-sm">
                    <p className="text-[11px] font-medium text-fg-subtle mb-1">{data.instrument} PnL</p>
                    <p className={`text-[13px] font-semibold tnum ${isProfit ? 'text-profit' : 'text-negative'}`}>
                      {formatUSD(data.pnl, { sign: true })}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine y={0} stroke="var(--color-line-strong)" />
          <Bar dataKey="pnl" radius={[4, 4, 4, 4]} animationDuration={1500} animationEasing="ease-out">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "var(--color-profit)" : "var(--color-negative)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
