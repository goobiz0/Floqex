"use client";

import { motion } from "motion/react";
import { FlowArrow, TerminalWindow, WebhooksLogo } from "@phosphor-icons/react";

const steps = [
  {
    icon: FlowArrow,
    title: "1. Define your edge",
    description: "Use our visual builder to set entry conditions, trailing stops, and profit targets. No coding required.",
  },
  {
    icon: TerminalWindow,
    title: "2. Backtest & refine",
    description: "Run your strategy against years of historical tick data in seconds to validate your edge before risking capital.",
  },
  {
    icon: WebhooksLogo,
    title: "3. Deploy & automate",
    description: "Connect to your broker and deploy to our low-latency execution engine. We handle the infrastructure, you keep the profits.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-32 relative border-t border-line/50">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl font-medium tracking-tight text-fg md:text-5xl mb-6">
            From idea to execution.
          </h2>
          <p className="text-lg text-fg-muted max-w-2xl mx-auto">
            We built the exact infrastructure we wanted for our own trading. Fast, reliable, and completely transparent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-[1px] bg-line/50 -z-10" />

          {steps.map((step, index) => (
            <motion.div 
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-24 h-24 mb-8 rounded-full bg-surface border border-line flex items-center justify-center relative shadow-sm group-hover:border-accent/50 transition-colors duration-300">
                <div className="absolute inset-0 bg-accent/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <step.icon size={32} className="text-fg group-hover:text-accent transition-colors duration-300" weight="light" />
              </div>
              <h3 className="text-xl font-medium text-fg mb-3">{step.title}</h3>
              <p className="text-fg-subtle leading-relaxed max-w-[280px]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
