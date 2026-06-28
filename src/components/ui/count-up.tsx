"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to the target with an ease-out curve.
 * Reduced-motion safe: when the user prefers reduced motion (or on the very first
 * paint) it renders the final value immediately, so no one waits on a count-up.
 */
export function CountUp({
  value,
  durationMs = 600,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  // Tracks the latest animated value (updated inside the rAF loop, never during
  // render) so a value change mid-animation continues smoothly from where the
  // number currently is rather than jumping from the previous target.
  const displayRef = useRef(value);
  const firstRef = useRef(true);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // No animation on first mount or under reduced motion: snap to the value.
    if (firstRef.current || reduce) {
      firstRef.current = false;
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    const from = displayRef.current;
    const delta = value - from;
    if (delta === 0) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = from + delta * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
