"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useMotionValue, useTransform, animate } from "motion/react";
import { ShieldCheck, Warning, SealCheck } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EdgeScore, EdgeFactor } from "@/lib/engine/validation";

const VERDICT = {
  Robust: { tone: "positive" as const, icon: SealCheck, ring: "var(--color-positive)", blurb: "Holds up out of sample and across nearby settings." },
  Promising: { tone: "warning" as const, icon: ShieldCheck, ring: "var(--color-warning)", blurb: "Shows an edge, but wants more evidence before live capital." },
  Fragile: { tone: "negative" as const, icon: Warning, ring: "var(--color-negative)", blurb: "Likely curve-fit. Treat results with caution." },
};

const EASE = [0.23, 1, 0.32, 1] as const;

// The scorecard renders empty first, settles, then fills. These durations run the
// dial and bars at ~45% of the previous speed so the reveal reads as deliberate,
// not a flash. Every fill draws in lockstep with its number counting up.
const ARM_DELAY = 0.42; // let the card mount and settle before anything fills
const DIAL_DURATION = 2.0; // was 0.9s
const BAR_DURATION = 1.3; // was 0.6s
const BAR_STAGGER = 0.12; // gentle cascade down the factor list

const CIRCUMFERENCE = 2 * Math.PI * 42;

export function EdgeScorecard({ edge }: { edge: EdgeScore }) {
  const reduce = useReducedMotion();
  // Re-key on the result so a fresh validation replays the load-then-fill
  // sequence from empty, instead of tweening from the previous run's values.
  const runKey = `${edge.verdict}:${edge.score}:${edge.factors.map((f) => f.points).join(",")}`;
  return <Scorecard key={runKey} edge={edge} reduce={Boolean(reduce)} />;
}

function Scorecard({ edge, reduce }: { edge: EdgeScore; reduce: boolean }) {
  const v = VERDICT[edge.verdict];
  const Icon = v.icon;
  const pct = Math.max(0, Math.min(100, edge.score));

  // Gate every fill on `armed`. It flips true once the card has loaded so the
  // dial and bars are visibly empty first, then animate up together. When motion
  // is reduced it starts armed, so there is nothing to schedule.
  const [armed, setArmed] = useState<boolean>(reduce);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setArmed(true), ARM_DELAY * 1000);
    return () => clearTimeout(t);
  }, [reduce]);

  // Count the headline score up from 0 to its final value, in lockstep with the
  // arc draw-on, so the eye lands on the result exactly as it resolves.
  const count = useMotionValue(reduce ? pct : 0);
  const display = useTransform(count, (n) => Math.round(n));
  useEffect(() => {
    if (reduce) {
      count.set(pct);
      return;
    }
    if (!armed) return;
    const controls = animate(count, pct, { duration: DIAL_DURATION, ease: EASE });
    return controls.stop;
  }, [pct, reduce, armed, count]);

  const scoredFactors = edge.factors.filter((f) => f.max > 0);

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
                strokeDasharray={CIRCUMFERENCE}
                initial={reduce ? false : { strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset: armed ? CIRCUMFERENCE * (1 - pct / 100) : CIRCUMFERENCE }}
                transition={{ duration: reduce ? 0 : DIAL_DURATION, ease: EASE }}
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
          {scoredFactors.map((f, i) => (
            <FactorBar key={f.label} factor={f} armed={armed} reduce={reduce} index={i} />
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

function FactorBar({ factor, armed, reduce, index }: { factor: EdgeFactor; armed: boolean; reduce: boolean; index: number }) {
  const target = factor.max > 0 ? (factor.points / factor.max) * 100 : 0;
  const delay = index * BAR_STAGGER;

  // Count each factor's points up in parallel with its own bar filling, so the
  // number and the bar tell the same story at the same pace.
  const count = useMotionValue(reduce ? factor.points : 0);
  const display = useTransform(count, (n) => n.toFixed(0));
  useEffect(() => {
    if (reduce) {
      count.set(factor.points);
      return;
    }
    if (!armed) return;
    const controls = animate(count, factor.points, { duration: BAR_DURATION, delay, ease: EASE });
    return controls.stop;
  }, [armed, reduce, factor.points, delay, count]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-fg">{factor.label}</span>
        <span className="tnum text-[11px] text-fg-subtle">
          <motion.span>{display}</motion.span> / {factor.max}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${armed ? target : 0}%` }}
          transition={{ duration: reduce ? 0 : BAR_DURATION, delay: reduce ? 0 : delay, ease: EASE }}
        />
      </div>
      <p className="mt-1 text-[11px] leading-snug text-fg-faint">{factor.detail}</p>
    </div>
  );
}
