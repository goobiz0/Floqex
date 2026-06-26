"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { authUrl } from "@/lib/urls";

import { Mockup, MockupFrame } from "@/components/ui/mockup";
import { Glow } from "@/components/ui/glow";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";

export function HeroClient() {
  const reduce = useReducedMotion();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  };

  return (
    <section className="relative overflow-hidden pt-28 pb-24 md:pt-36 md:pb-32">
      {/* Slow light-emerald brand aura behind the hero */}
      <div
        aria-hidden
        className="hero-aura pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] [mask-image:radial-gradient(60%_55%_at_50%_25%,black,transparent)]"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center"
      >
        <motion.div
          variants={item}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted"
        >
          <span className="relative flex h-1.5 w-1.5">
            {!reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Live automated execution
        </motion.div>

        <motion.h1
          variants={item}
          className="text-balance text-5xl font-extrabold leading-[1.04] tracking-tight text-fg md:text-6xl lg:text-7xl"
        >
          Trade smarter.
          <br />
          Zero code required.
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-pretty text-lg text-fg-muted md:text-xl"
        >
          A precise trading engine that runs your strategies while keeping you
          fully in control. Built for speed and clarity.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
        >
          <Button
            href={authUrl("/sign-up")}
            size="lg"
            className="h-12 w-full px-6 text-[15px] font-semibold sm:w-auto"
          >
            Start building for free
          </Button>
          <Button
            href="#features"
            variant="secondary"
            size="lg"
            className="h-12 w-full px-6 text-[15px] font-medium sm:w-auto"
          >
            Explore platform
          </Button>
        </motion.div>
      </motion.div>

      {/* Animated dashboard preview */}
      <div className="relative z-10 mx-auto mt-16 max-w-[1080px] px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <MockupFrame size="small">
            <Mockup type="responsive">
              <div className="aspect-[16/10] w-full">
                <DashboardMockup />
              </div>
            </Mockup>
          </MockupFrame>
          <Glow
            variant="top"
            className="animate-appear-zoom opacity-0 delay-700"
          />
        </motion.div>
      </div>
    </section>
  );
}
