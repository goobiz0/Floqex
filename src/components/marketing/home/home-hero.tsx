"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { authUrl } from "@/lib/urls";
import { LiveInstrument } from "./live-instrument";

/**
 * Landing hero (revealed behind the arc curtain). Asymmetric split: value prop
 * and CTAs on the left, the live agent instrument on the right. One small text
 * element in the stack (the eyebrow), headline, subtext, two CTAs. Free is stated
 * directly in the primary CTA label, not as a trailing tagline.
 */
export function HomeHero() {
  const reduce = useReducedMotion();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.09, delayChildren: 0.04 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 280, damping: 26 },
    },
  };

  return (
    <section className="relative overflow-hidden pt-24 pb-20 md:pb-28">
      <div
        aria-hidden
        className="hero-aura pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] [mask-image:radial-gradient(60%_55%_at_50%_20%,black,transparent)]"
      />

      <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <motion.div
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
          className="flex flex-col items-start text-left"
        >
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-fg-muted"
          >
            <span className="relative flex h-1.5 w-1.5">
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            No-code trading automation
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-6 text-balance text-5xl font-semibold leading-[1.03] tracking-tight text-fg md:text-6xl lg:text-[4.25rem]"
          >
            Automate your edge.
            <br />
            <span className="text-accent">Keep the control.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-md text-pretty text-lg text-fg-muted"
          >
            Floqex turns your trading rules into bots that run at your broker,
            with hard risk limits you set and a feed that shows every move.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          >
            <Button
              href={authUrl("/sign-up")}
              size="lg"
              className="h-12 w-full px-7 text-[0.95rem] font-semibold sm:w-auto"
            >
              Start free
            </Button>
            <Button
              href="#pricing"
              variant="secondary"
              size="lg"
              className="h-12 w-full px-7 text-[0.95rem] font-medium sm:w-auto"
            >
              See pricing
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <LiveInstrument />
        </motion.div>
      </div>
    </section>
  );
}
