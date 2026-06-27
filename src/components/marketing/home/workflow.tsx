"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  PencilSimpleLine,
  ChartBar,
  RocketLaunch,
  type Icon,
} from "@phosphor-icons/react";

type Step = { n: string; icon: Icon; title: string; body: string };

const steps: Step[] = [
  {
    n: "01",
    icon: PencilSimpleLine,
    title: "Write your rules",
    body: "Set entries, exits, trailing stops and targets in a visual builder. No scripting, no broker SDKs to wrangle.",
  },
  {
    n: "02",
    icon: ChartBar,
    title: "Backtest and paper trade",
    body: "Replay your strategy on historical data, then run it live on a paper account until the numbers earn your trust.",
  },
  {
    n: "03",
    icon: RocketLaunch,
    title: "Go live, stay in control",
    body: "Connect your broker and let the engine execute. Pause, edit, or hit the emergency stop at any time.",
  },
];

export function Workflow() {
  const reduce = useReducedMotion();

  return (
    <section className="relative bg-base py-24 md:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg md:text-4xl">
            From idea to live trade in three moves.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            The same path the team built for its own trading: fast to set up,
            honest about risk, yours to interrupt.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connecting vertical line on desktop */}
          <div className="absolute left-[39px] top-6 bottom-6 hidden w-px bg-line md:block" />
          
          <div className="grid gap-8 md:grid-cols-3 md:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial={reduce ? false : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group relative flex flex-col"
              >
                {/* Horizontal connector on desktop */}
                <div className="absolute left-[39px] top-5 hidden h-px w-[20px] bg-line md:block" />
                
                <div className="relative flex flex-col rounded-[var(--radius-card)] border border-line bg-elevated p-7 transition-colors duration-300 hover:border-line-strong md:ml-[60px]">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
                      <step.icon size={22} weight="fill" />
                    </span>
                    <span className="tnum text-2xl font-semibold text-fg-faint transition-colors group-hover:text-fg-subtle">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-fg">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-[0.95rem] leading-relaxed text-fg-muted">
                    {step.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
