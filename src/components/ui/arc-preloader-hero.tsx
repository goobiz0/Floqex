"use client";

import * as React from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";
import { Mark } from "@/components/brand/wordmark";

/* ── types ───────────────────────────────────────────────────── */

export type ArcRevealGreeting = {
  /** Greeting text in the target script */
  text: string;
  /** Optional `lang` attribute applied to the span (helps screen readers / font rendering) */
  lang?: string;
};

export interface ArcRevealHeroProps {
  /** Greetings cycled before the arc reveal. */
  greetings?: ArcRevealGreeting[];
  /** How long each greeting is held on screen (ms). */
  greetingHold?: number;
  /** Duration of the curved curtain reveal (ms). */
  revealDuration?: number;
  /** Outer `<section>` class. Receives the *post-reveal* surface. */
  className?: string;
  /** Class for the intro (pre-reveal) overlay surface. */
  introClassName?: string;
  /** Class for the cycled greeting `<span>`. */
  greetingClassName?: string;
  /** Class for the wrapper around `children` (the revealed content). */
  revealClassName?: string;
  /**
   * Optional `sessionStorage` key — when set, the intro plays only once per
   * session for the same key. Leave unset to replay on every mount.
   */
  storageKey?: string;
  /** Content shown after the curtain reveal (the "landing"). */
  children?: React.ReactNode;
}

/* ── defaults ────────────────────────────────────────────────── */

const DEFAULT_GREETINGS: ArcRevealGreeting[] = [
  { text: "Disciplined." },
  { text: "Automated." },
  { text: "Transparent." },
];

type Phase = "intro" | "reveal" | "done";

/* ── component ───────────────────────────────────────────────── */

export function ArcRevealHero({
  greetings = DEFAULT_GREETINGS,
  greetingHold = 540,
  revealDuration = 1500,
  className,
  introClassName,
  greetingClassName,
  revealClassName,
  storageKey,
  children,
}: ArcRevealHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  const [phase, setPhase] = React.useState<Phase>("intro");
  const [index, setIndex] = React.useState(0);

  // Drive the arc shape from a single 0→1 progress. The curtain is the page
  // surface rising from the bottom with a curved (concave-up) leading edge,
  // sweeping over the branded intro to reveal the content underneath:
  //   t=0 → chord at y=110 (off-screen below) → no curtain visible
  //   t=1 → chord at y=-36 (off-screen above) → full-screen curtain risen
  const progress = useMotionValue(0);
  const arcPath = useTransform(progress, (p: number) => {
    const edge = 110 - p * 146;
    const control = edge - 26;
    return `M 0 ${edge} Q 50 ${control} 100 ${edge} L 100 110 L 0 110 Z`;
  });
  // The leading edge alone, painted as a soft emerald light line.
  const arcEdge = useTransform(progress, (p: number) => {
    const edge = 110 - p * 146;
    const control = edge - 26;
    return `M 0 ${edge} Q 50 ${control} 100 ${edge}`;
  });

  // Honor reduced-motion + replay-suppression on mount. This deliberately
  // resolves the phase *after* hydration: the overlay is rendered on the server
  // and the first client paint, then we read matchMedia / sessionStorage (which
  // only exist on the client) to skip the intro. Doing it in a lazy initial
  // state instead would cause an SSR hydration mismatch, so the synchronous
  // setState here is intentional.
  React.useEffect(() => {
    if (prefersReducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("done");
      return;
    }
    if (storageKey && typeof window !== "undefined") {
      try {
        if (window.sessionStorage.getItem(storageKey) === "done") {
          setPhase("done");
        }
      } catch {
        /* sessionStorage can throw in private mode — fall through */
      }
    }
  }, [prefersReducedMotion, storageKey]);

  // Lock body scroll while the intro curtain covers the viewport.
  React.useEffect(() => {
    if (phase === "done" || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  // Greeting cycle.
  React.useEffect(() => {
    if (phase !== "intro") return;
    const isLast = index >= greetings.length - 1;
    if (isLast) {
      const t = window.setTimeout(() => setPhase("reveal"), greetingHold + 180);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setIndex((i) => i + 1), greetingHold);
    return () => window.clearTimeout(t);
  }, [phase, index, greetingHold, greetings.length]);

  // Drive the curtain reveal.
  React.useEffect(() => {
    if (phase !== "reveal") return;
    const controls = animate(progress, 1, {
      duration: revealDuration / 1000,
      ease: [0.85, 0, 0.15, 1],
      onComplete: () => {
        if (storageKey && typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(storageKey, "done");
          } catch {
            /* ignore */
          }
        }
        setPhase("done");
      },
    });
    return () => controls.stop();
  }, [phase, progress, revealDuration, storageKey]);

  const showOverlay = phase !== "done";
  const current = greetings[Math.min(index, greetings.length - 1)];

  return (
    <section
      aria-label="Hero"
      className={cn(
        "relative isolate min-h-screen w-full overflow-hidden bg-base text-fg",
        className,
      )}
    >
      <div
        className={cn("relative z-0", revealClassName)}
        // Keep the revealed content out of the tab order / a11y tree while the
        // intro curtain covers it, so keyboard users can't reach hidden CTAs.
        aria-hidden={showOverlay || undefined}
        inert={showOverlay || undefined}
      >
        {children}
      </div>

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="arc-reveal-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            // Fixed + full-viewport so every surface (the nav included) sits
            // behind it for the duration of the intro.
            className={cn(
              "fixed inset-0 z-[100] h-[100dvh] w-full overflow-hidden bg-base",
              introClassName,
            )}
          >
            {/* Branded emerald wash behind the greeting — the rising near-black
                curtain visibly wipes this away to reveal the page. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, color-mix(in oklch, var(--color-accent) 13%, transparent) 0%, color-mix(in oklch, var(--color-accent) 5%, transparent) 34%, transparent 62%), radial-gradient(58% 44% at 50% 40%, color-mix(in oklch, var(--color-accent) 22%, transparent) 0%, transparent 70%)",
              }}
            />
            <div
              aria-hidden
              className="grid-faint pointer-events-none absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(60%_50%_at_50%_42%,black,transparent)]"
            />

            {/* Cycled greeting + brand mark */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-7">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Mark className="h-10 w-10" />
              </motion.div>
              <div className="flex h-16 items-center justify-center">
                <AnimatePresence mode="wait">
                  {phase === "intro" && current && (
                    <motion.span
                      key={`${index}-${current.text}`}
                      lang={current.lang}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        "select-none px-6 text-center text-5xl font-semibold tracking-tight text-fg sm:text-6xl md:text-7xl",
                        greetingClassName,
                      )}
                    >
                      {current.text}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Rising curved curtain — base fill with a soft emerald leading edge */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <motion.path d={arcPath} style={{ fill: "var(--color-base)" }} />
              <motion.path
                d={arcEdge}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={0.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ opacity: 0.7 }}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default ArcRevealHero;
