"use client";

import { motion, useReducedMotion } from "motion/react";
import { RemotionPlayer } from "../remotion/remotion-provider";
import { DemoWalkthrough } from "../remotion/demo-walkthrough";

export function PlatformDemo() {
  const reduce = useReducedMotion();

  return (
    <section id="demo" className="relative border-t border-line bg-elevated/40 py-24 md:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg md:text-4xl">
            See how a bot goes from idea to live trade
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-fg-muted">
            Three steps, one platform. No code, no broker SDK, no stitching tools together.
          </p>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 relative"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 z-0 rounded-[var(--radius-lg)] opacity-40 blur-2xl [background:radial-gradient(ellipse_at_top,var(--color-accent-soft),transparent_60%)]"
          />
          
          <div className="relative z-10 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-elevated shadow-2xl">
            <RemotionPlayer
              component={DemoWalkthrough}
              durationInFrames={600}
              fps={30}
              compositionWidth={1200}
              compositionHeight={720}
              className="w-full border-none rounded-none"
              controls={true}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
