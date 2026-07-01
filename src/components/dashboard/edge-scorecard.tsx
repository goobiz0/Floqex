"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useMotionValue, useTransform, animate } from "motion/react";
import { ShieldCheck, Warning, SealCheck } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EdgeScore } from "@/lib/engine/validation";

const VERDICT = {
  Robust: { tone: "positive" as const, icon: SealCheck, ring: "var(--color-positive)", blurb: "Holds up out of sample and across nearby settings." },
  Promising: { tone: "warning" as const, icon: ShieldCheck, ring: "var(--color-warning)", blurb: "Shows an edge, but wants more evidence before live capital." },
  Fragile: { tone: "negative" as const, icon: Warning, ring: "var(--color-negative)", blurb: "Likely curve-fit. Treat results with caution." },
};

export function EdgeScorecard({ edge }: { edge: EdgeScore }) {
  const reduce = useReducedMotion();
  const v = VERDICT[edge.verdict];
  const Icon = v.icon;
  const pct = Math.max(0, Math.min(100, edge.score));

  // Count the headline score up from 0 to its final value, in lockstep with the
  // arc draw-on, so the eye lands on the result as it resolves.
  const count = useMotionValue(reduce ? pct : 0);
  const display = useTransform(count, (n) => Math.round(n));
  useEffect(() => {
    if (reduce) {
      count.set(pct);
      return;
    }
    const controls = animate(count, pct, { duration: 0.9, ease: [0.23, 1, 0.32, 1] });
    return controls.stop;
  }, [pct, reduce, count]);

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* Score dial */}
        <div className="flex items-center gap-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" role="img" aria-label={`Edge score ${pct} out of 100`}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-line)" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={v.ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                initial={reduce ? false : { strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }}
                transition={{ duration: reduce ? 0 : 0.9, ease: [0.23, 1, 0.32, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span className="tnum text-2xl font-bold text-fg">{display}</motion.span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">/ 100</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Icon size={18} weight="duotone" className={cn(v.tone === "positive" && "text-positive", v.tone === "warning" && "text-warning", v.tone === "negative" && "text-negative")} />
              <Badge tone={v.tone}>{edge.verdict}</Badge>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-fg">Edge Score</h2>
            <p className="mt-0.5 max-w-xs text-xs leading-relaxed text-fg-subtle">{v.blurb}</p>
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="flex-1 space-y-2.5 sm:border-l sm:border-line sm:pl-6">
          {edge.factors.filter((f) => f.max > 0).map((f) => (
            <div key={f.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-fg">{f.label}</span>
                <span className="tnum text-[11px] text-fg-subtle">
                  {f.points.toFixed(0)} / {f.max}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${f.max > 0 ? (f.points / f.max) * 100 : 0}%` }}
                  transition={{ duration: reduce ? 0 : 0.6, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-snug text-fg-faint">{f.detail}</p>
            </div>
          ))}
          {edge.factors.some((f) => f.max === 0) && (
            <p className="text-[11px] font-medium text-negative">
              {edge.factors.find((f) => f.max === 0)?.detail}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
