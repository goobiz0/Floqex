"use client";

import { useEffect, useState } from "react";
import { TradeChart } from "@/components/ui/trade-chart";
import { Spinner } from "@phosphor-icons/react";
import type { CandlestickData, Time } from "lightweight-charts";

export function MarketChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<CandlestickData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&days=180`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Could not load historical data");
        }
        const json = await res.json();
        if (active) {
          const bars: CandlestickData[] = (json.bars || []).map((b: any) => ({
            time: b.date as Time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }));
          setData(bars.sort((a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime()));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [symbol]);

  if (loading && !data) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-[var(--radius-card)] border border-line bg-surface/40">
        <Spinner size={24} className="animate-spin text-fg-subtle" />
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-[var(--radius-card)] border border-line bg-surface/40 px-6 text-center text-sm text-fg-subtle">
        {error || "No historical data available for charting."}
      </div>
    );
  }

  return (
    <div className="relative">
      <TradeChart data={data} />
    </div>
  );
}
