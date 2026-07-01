"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Pause, Play, CheckCircle, XCircle } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";
import { getLiveDebugger, type LiveDebuggerResponse } from "@/app/dashboard/strategy/actions";
import type { PreviewResult, GroupResult, ConditionResult } from "@/lib/engine/signal-preview";
import { OPERATORS, INDICATORS } from "@/lib/custom-strategy";

const POLL_MS = 5000;

export function LiveSignalDebugger({ strategyId }: { strategyId: string }) {
  const reduce = useReducedMotion();
  const [result, setResult] = useState<PreviewResult | null>(null);
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
      try {
        const res = await getLiveDebugger({ strategyId });
        if (cancelled) return;
        if (res.ok) {
          setResult(res.result);
          setAsOf(res.asOf);
          setError(null);
        } else {
          setError(res.error);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to fetch debugger data");
      }
      if (!cancelled && live) timer.current = setTimeout(() => start(poll), POLL_MS);
    };
    start(poll);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [live, strategyId]);

  const hasSetup = result?.allMet;
  const pulseColor = hasSetup ? (result?.direction === "LONG" ? "positive" : "negative") : "neutral";

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Live Signal Debugger</CardTitle>
            <InfoTip text="Evaluates every custom condition against live prices to see exactly what is keeping the bot from entering." />
            {live && (
              <StatusDot tone={pulseColor} pulse={hasSetup} className="ml-1" />
            )}
          </div>
          <p className="mt-1 text-sm text-fg-subtle">
            Real-time condition evaluation.
          </p>
        </div>
        <button
          type="button"
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
          <p className="max-w-sm text-sm text-fg-subtle">
            Press Go live to evaluate each condition against real-time data.
          </p>
        </div>
      )}

      {live && !result && !error && (
        <div className="mt-5 space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-16 rounded-[var(--radius-control)]" />
          ))}
        </div>
      )}

      {live && result && !error && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-fg">Instrument: {result.instrument}</span>
            <span className="tnum text-fg-subtle">{result.price != null ? result.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"}</span>
          </div>
          {result.error ? (
            <div className="text-sm text-warning">{result.error}</div>
          ) : result.groups.length === 0 ? (
            <div className="text-sm text-fg-subtle">No conditions defined.</div>
          ) : (
            <div className="space-y-4">
              {result.groups.map((group, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.18, delay: reduce ? 0 : i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "rounded-[var(--radius-control)] border p-4 transition-colors duration-200",
                    group.met ? "border-positive/30 bg-positive/5" : "border-line bg-base/40"
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {group.met ? <CheckCircle size={16} weight="fill" className="text-positive" /> : <XCircle size={16} weight="fill" className="text-fg-subtle" />}
                    <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                      Group {i + 1} (Match {group.join})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.conditions.map((cond, j) => (
                      <div key={j} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-fg-subtle">
                          <span className="font-medium text-fg">{INDICATORS.find(ind => ind.key === cond.left)?.label || cond.left}</span>
                          <span>{OPERATORS.find(op => op.key === cond.op)?.label || cond.op}</span>
                          <span className="font-medium text-fg">
                            {typeof cond.right === "string" 
                              ? INDICATORS.find(ind => ind.key === cond.right)?.label || cond.right 
                              : cond.right}
                          </span>
                        </div>
                        {cond.met ? <CheckCircle size={16} weight="bold" className="text-positive" /> : <XCircle size={16} weight="bold" className="text-fg-subtle/50" />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
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
