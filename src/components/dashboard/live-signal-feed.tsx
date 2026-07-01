"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Broadcast, Pause, Play, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";
import { getLiveSignals, getEngineHealth, type LiveSignalRow, type EngineHealth } from "@/app/dashboard/strategy/actions";

const POLL_MS = 5000;
const HEALTH_POLL_MS = 12000;

/** Compact engine-liveness pill: is the worker actively ticking the user's bots. */
function EngineStatusPill() {
  const [health, setHealth] = useState<EngineHealth | null>(null);
  useEffect(() => {
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const h = await getEngineHealth();
        if (!cancelled) setHealth(h);
      } catch {
        /* leave previous state */
      }
      if (!cancelled) t = setTimeout(poll, HEALTH_POLL_MS);
    };
    poll();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, []);

  if (!health) return null;
  const tone = health.status === "live" ? "positive" : health.status === "stale" ? "warning" : "neutral";
  const label =
    health.status === "live"
      ? `Engine live · ${health.runningBots} bot${health.runningBots === 1 ? "" : "s"}`
      : health.status === "stale"
        ? "Engine not responding"
        : "No running bots";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-fg-subtle">
      <StatusDot tone={tone} pulse={health.status === "live"} />
      {label}
    </span>
  );
}

/**
 * Live Signal Feed — runs the strategy's exact signal logic against live market
 * data on a poll, WITHOUT trading, so the user can watch their conditions fire
 * before going live. Read-only; mirrors the engine's generators 1:1.
 */
export function LiveSignalFeed({ strategyId }: { strategyId: string }) {
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<LiveSignalRow[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!live) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      const res = await getLiveSignals({ strategyId });
      if (cancelled) return;
      if (res.ok) {
        setRows(res.rows);
        setAsOf(res.asOf);
        setError(null);
      } else {
        setError(res.error);
      }
      if (!cancelled && live) timer.current = setTimeout(() => start(poll), POLL_MS);
    };
    start(poll);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [live, strategyId]);

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Live Signal Feed</CardTitle>
            <InfoTip text="Runs your strategy's entry logic against live prices on a 5s poll, without placing any trades. Proof your conditions work before you wire it to capital." />
          </div>
          <p className="mt-1 text-sm text-fg-subtle">
            Watch your logic fire in real time. Nothing here trades.
          </p>
          <div className="mt-2">
            <EngineStatusPill />
          </div>
        </div>
        <button
          onClick={() => setLive((v) => !v)}
          className={cn(
            "tactile inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-3.5 py-1.5 text-sm font-semibold",
            live
              ? "bg-accent-soft text-accent ring-1 ring-inset ring-[var(--accent-ring)]"
              : "bg-surface text-fg ring-1 ring-inset ring-line hover:ring-line-strong",
          )}
        >
          {live ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" />}
          {live ? "Streaming" : "Go live"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-[var(--radius-control)] border border-negative-soft bg-negative-soft/40 p-3 text-sm text-negative">
          {error}
        </div>
      )}

      {!live && !error && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line bg-surface/40 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-accent">
            <Broadcast size={22} weight="duotone" />
          </div>
          <p className="max-w-sm text-sm text-fg-subtle">
            Press Go live to stream your strategy&apos;s current read on each instrument.
          </p>
        </div>
      )}

      {live && (
        <div className="mt-5 space-y-2.5">
          {rows.length === 0 ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-16 rounded-[var(--radius-control)]" />
              ))}
            </div>
          ) : (
            rows.map((row, i) => (
              <motion.div
                key={row.instrument}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.18, delay: reduce ? 0 : i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <SignalRow row={row} />
              </motion.div>
            ))
          )}
          {asOf && (
            <p className="pt-1 text-right text-[11px] text-fg-faint">
              Updated {new Date(asOf).toLocaleTimeString()} · refreshes every {POLL_MS / 1000}s
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function SignalRow({ row }: { row: LiveSignalRow }) {
  const hasSetup = row.signal != null;
  const dir = row.signal?.direction;
  const tone = hasSetup ? (dir === "LONG" ? "positive" : "negative") : row.isOpen ? "warning" : "neutral";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-[var(--radius-control)] border bg-base/40 p-3.5 transition-colors duration-200",
        hasSetup ? "border-accent/40 bg-accent-soft/30" : "border-line",
      )}
    >
      <StatusDot tone={tone} pulse={hasSetup || row.isOpen} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fg">{row.instrument}</span>
          {row.price != null && (
            <span className="tnum text-xs text-fg-subtle">{row.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          )}
          {hasSetup && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                dir === "LONG" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative",
              )}
            >
              {dir === "LONG" ? <ArrowUp size={10} weight="bold" /> : <ArrowDown size={10} weight="bold" />}
              {dir}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-fg-subtle">{row.note}</p>
      </div>
      {hasSetup && row.signal && (
        <div className="hidden shrink-0 gap-4 text-right sm:flex">
          <Metric label="Entry" value={row.signal.entryPrice} />
          <Metric label="Stop" value={row.signal.stopPrice} />
          <Metric label="Target" value={row.signal.targetPrice} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-fg-faint">{label}</p>
      <p className="tnum text-xs font-semibold text-fg">{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
    </div>
  );
}
