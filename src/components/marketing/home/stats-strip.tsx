"use client";

import { motion, useReducedMotion } from "motion/react";

const stats = [
  { label: "Bots deployed", skeleton: true },
  { label: "Orders executed", skeleton: true },
  { label: "Brokers supported", value: "5" },
  { label: "Uptime", skeleton: true },
];

export function StatsStrip() {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-line bg-base py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex flex-col items-center justify-center gap-3 text-center"
            >
              {stat.skeleton ? (
                <div className="skeleton h-10 w-28 rounded-[var(--radius-control)]" />
              ) : (
                <span className="tnum text-4xl font-semibold tracking-tight text-fg">
                  {stat.value}
                </span>
              )}
              <span className="text-[0.85rem] font-medium text-fg-subtle">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
