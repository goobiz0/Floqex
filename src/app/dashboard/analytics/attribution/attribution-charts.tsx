"use client";

import React, { useMemo } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const CustomTooltipHeatmap = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.count === 0) return null;
    return (
      <div className="rounded-[6px] border border-line bg-base p-2 text-xs shadow-xl">
        <div className="font-medium text-fg">
          {data.day} {data.hour.toString().padStart(2, "0")}:00
        </div>
        <div className="mt-1 text-fg-subtle">
          Trades: <span className="text-fg">{data.count}</span>
        </div>
        <div className="text-fg-subtle">
          P&L: <span className={data.pnl >= 0 ? "text-profit" : "text-negative"}>{formatUSD(data.pnl)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomTooltipBar = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-[6px] border border-line bg-base p-2 text-xs shadow-xl">
        <div className="font-medium text-fg">{data.instrument}</div>
        <div className="mt-1 text-fg-subtle">
          Trades: <span className="text-fg">{data.count}</span>
        </div>
        <div className="text-fg-subtle">
          Win Rate: <span className="text-fg">{data.winRate.toFixed(1)}%</span>
        </div>
        <div className="text-fg-subtle">
          P&L: <span className={data.pnl >= 0 ? "text-profit" : "text-negative"}>{formatUSD(data.pnl)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function AttributionCharts({
  timeData,
  instrumentData,
}: {
  timeData: { day: string; hour: number; pnl: number; count: number }[];
  instrumentData: { instrument: string; pnl: number; count: number; winRate: number }[];
}) {
  const maxAbsPnlTime = useMemo(
    () => Math.max(1, ...timeData.map((d) => Math.abs(d.pnl))),
    [timeData]
  );

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Custom shape for the scatter heatmap
  const renderShape = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.count === 0) {
      return <rect x={cx - 10} y={cy - 10} width={20} height={20} fill="var(--color-base)" opacity={0.3} rx={4} />;
    }
    const isProfit = payload.pnl >= 0;
    const fill = isProfit ? "var(--color-profit)" : "var(--color-negative)";
    const intensity = Math.max(0.2, Math.abs(payload.pnl) / maxAbsPnlTime);
    return (
      <rect
        x={cx - 10}
        y={cy - 10}
        width={20}
        height={20}
        fill={fill}
        opacity={intensity}
        rx={4}
        className="transition-opacity hover:opacity-100"
      />
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <CardTitle>Time of Day vs Day of Week</CardTitle>
        <p className="mb-6 mt-1 text-xs text-fg-subtle">
          Heatmap colored by net P&L. Darker squares indicate higher magnitude.
        </p>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis
                type="number"
                dataKey="hour"
                name="Hour"
                domain={[0, 23]}
                tickCount={24}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }}
                tickFormatter={(val) => `${val}h`}
              />
              <YAxis
                type="category"
                dataKey="day"
                name="Day"
                reversed
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }}
                // ensure it sorts consistently
                ticks={days}
              />
              <ZAxis type="number" dataKey="pnl" range={[100, 100]} />
              <RechartsTooltip cursor={{ strokeDasharray: "3 3", stroke: "var(--color-line)" }} content={<CustomTooltipHeatmap />} />
              <Scatter data={timeData} shape={renderShape} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <CardTitle>Instrument Performance</CardTitle>
        <p className="mb-6 mt-1 text-xs text-fg-subtle">
          Net P&L by instrument.
        </p>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={instrumentData}
              layout="vertical"
              margin={{ top: 20, right: 20, bottom: 20, left: 50 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }}
                tickFormatter={(v) => formatUSD(v).replace(".00", "")}
              />
              <YAxis
                type="category"
                dataKey="instrument"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--color-fg)" }}
              />
              <RechartsTooltip cursor={{ fill: "var(--color-base)", opacity: 0.5 }} content={<CustomTooltipBar />} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                {instrumentData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl >= 0 ? "var(--color-profit)" : "var(--color-negative)"}
                    opacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
