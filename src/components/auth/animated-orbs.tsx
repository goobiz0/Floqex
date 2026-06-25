"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Calm, on-brand backdrop for the auth brand panel: two soft emerald glows that
 * drift slowly behind the content. Single accent only (no teal/sky/blue), and
 * it collapses to static glows under prefers-reduced-motion. Texture (grain,
 * grid) is layered by the auth layout, not here, to avoid stacking noise.
 */
export function AnimatedOrbs() {
  const reduce = useReducedMotion();

  const glow =
    "absolute rounded-full blur-[120px] bg-[radial-gradient(circle,color-mix(in_oklch,var(--color-accent)_55%,transparent)_0%,transparent_70%)]";

  if (reduce) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
        <div className={`${glow} -left-[10%] -top-[10%] h-[460px] w-[460px]`} />
        <div className={`${glow} -bottom-[15%] -right-[10%] h-[520px] w-[520px] opacity-70`} />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
      <motion.div
        aria-hidden
        className={`${glow} -left-[10%] -top-[10%] h-[460px] w-[460px]`}
        animate={{ x: ["0%", "12%", "-4%", "0%"], y: ["0%", "8%", "-12%", "0%"], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 26, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        aria-hidden
        className={`${glow} -bottom-[15%] -right-[10%] h-[520px] w-[520px] opacity-70`}
        animate={{ x: ["0%", "-12%", "8%", "0%"], y: ["0%", "-8%", "12%", "0%"], scale: [1, 0.94, 1.06, 1] }}
        transition={{ duration: 32, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}
