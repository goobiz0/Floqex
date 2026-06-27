"use client";

import { useEffect, useState } from "react";
import { TrendUp, TrendDown, RocketLaunch, ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type Mover = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
};

type MoversResult = { gainers: Mover[]; losers: Mover[]; asOf: string };

// Real Yahoo-backed gainers/losers. Polls every 60s while mounted and shares the
// server-side 30s cache, so the numbers are live without fabricating anything.
export function TopMoversWidget({ includeAsx = true }: { includeAsx?: boolean }) {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const [data, setData] = useState<MoversResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/market/movers?asx=${includeAsx}`, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const json = (await res.json()) as MoversResult;
        setData(json);
        setStatus("ready");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setStatus("error");
      }
    }

    load();
    const timer = setInterval(load, 60_000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [includeAsx, reloadKey]);

  const rows = data ? (tab === "gainers" ? data.gainers : data.losers) : [];

  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <RocketLaunch size={16} weight="duotone" className="text-accent" />
          <h3 className="text-[13px] font-semibold tracking-wide">Top Movers</h3>
        </div>
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-surface p-0.5">
          <button
            onClick={() => setTab("gainers")}
            className={cn("rounded-[var(--radius-pill)] px-2 py-1 text-[10px] font-medium transition-colors", tab === "gainers" ? "bg-accent text-[var(--color-on-accent)]" : "text-fg-subtle hover:text-fg")}
          >
            Gainers
          </button>
          <button
            onClick={() => setTab("losers")}
            className={cn("rounded-[var(--radius-pill)] px-2 py-1 text-[10px] font-medium transition-colors", tab === "losers" ? "bg-accent text-[var(--color-on-accent)]" : "text-fg-subtle hover:text-fg")}
          >
            Losers
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {status === "loading" && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-[var(--radius-pill)] bg-surface" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-16 animate-pulse rounded bg-surface" />
                    <div className="h-2.5 w-24 animate-pulse rounded bg-surface" />
                  </div>
                </div>
                <div className="h-3 w-12 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-xs text-fg-subtle">Couldn&apos;t load market movers.</p>
            <button
              onClick={() => { setStatus("loading"); setReloadKey((k) => k + 1); }}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface-hover"
            >
              <ArrowClockwise size={13} weight="bold" /> Retry
            </button>
          </div>
        )}

        {status === "ready" && rows.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-fg-subtle text-center">Markets are quiet right now.</p>
          </div>
        )}

        {status === "ready" && rows.length > 0 && (
          <div className="flex flex-col gap-3">
            {rows.map((item, i) => {
              const up = item.changePercent > 0;
              return (
                <motion.div
                  key={item.symbol}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                  className="group flex items-center justify-between rounded-[var(--radius-card)] border border-transparent p-2 transition-colors hover:border-line hover:bg-surface"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] bg-surface", up ? "text-profit" : "text-negative")}>
                      {up ? <TrendUp size={16} weight="bold" /> : <TrendDown size={16} weight="bold" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.symbol}</p>
                      <p className="max-w-[140px] truncate text-[11px] text-fg-subtle">{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-sm font-semibold tracking-tight">
                      {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={cn("tnum mt-0.5 text-[11px] font-medium", up ? "text-profit" : "text-negative")}>
                      {up ? "+" : ""}{item.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
