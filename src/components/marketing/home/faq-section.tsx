"use client";

import { useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const faqs: { q: string; a: string }[] = [
  {
    q: "What brokers does Floqex support?",
    a: "Floqex connects to OANDA, Interactive Brokers, Tradovate, Alpaca and Coinbase. You link your existing broker account and the engine places orders directly there. Your funds never leave your broker.",
  },
  {
    q: "Is my broker account safe?",
    a: "Floqex never holds your money or has withdrawal access. The connection uses read and trade permissions only. You can revoke access from your broker at any time, and the emergency stop shuts everything down instantly.",
  },
  {
    q: "Do I need to know how to code?",
    a: "Not at all. The strategy builder is visual: you compose conditions as blocks, set your risk parameters with sliders and inputs, and the engine handles execution. No scripting, no broker SDKs.",
  },
  {
    q: "What happens if I lose internet?",
    a: "Your bots run on Floqex infrastructure, not on your machine. If your connection drops, the engine keeps executing and enforcing your risk limits. You can check back any time to see what happened in the agent feed.",
  },
  {
    q: "Can I paper trade before going live?",
    a: "Yes. The free plan gives you a full paper trading environment with no time limit. You get the same dashboard, journal, analytics and agent feed as live traders, just on simulated fills.",
  },
  {
    q: "How does the risk engine work?",
    a: "You set a maximum daily drawdown, a per-trade risk percentage, and a maximum number of trades per session. The engine enforces these limits on every order and will pause the bot if any limit is hit.",
  },
  {
    q: "Can I run multiple bots at once?",
    a: "Yes, depending on your plan. The free plan supports one bot. Trader supports up to 3, Pro up to 10, and Elite up to 25 concurrent bots across multiple accounts and instruments.",
  },
  {
    q: "What markets can I trade?",
    a: "Forex, US equities, futures and crypto, depending on which broker you connect. The engine supports any instrument your broker offers. Market hours and sessions are tracked automatically.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-6 text-left transition-colors hover:text-fg"
        aria-expanded={open}
      >
        <span className="text-[1.05rem] font-medium text-fg">{q}</span>
        <CaretDown
          size={18}
          weight="bold"
          className={cn(
            "shrink-0 text-fg-faint transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-[0.95rem] leading-relaxed text-fg-muted">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="relative py-24 md:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg md:text-4xl">
            Common questions
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Straight answers about the platform, your broker, and your data.
          </p>

          <div className="mt-12 border-t border-line">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
