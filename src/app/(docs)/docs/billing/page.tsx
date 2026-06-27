"use client";

import { motion } from "motion/react";
import { Check, Star } from "@phosphor-icons/react/dist/ssr";

export default function BillingPage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Billing & Plans
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Start for free with paper trading to validate the edge. Upgrade to unlock live execution and multiple strategies.
        </p>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="grid gap-6 md:grid-cols-3"
      >
        
        {/* Free Tier */}
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 flex flex-col">
          <h3 className="text-xl font-semibold text-fg mb-2">Free</h3>
          <div className="text-3xl font-bold text-fg mb-6">$0<span className="text-base font-normal text-fg-muted">/mo</span></div>
          <p className="text-sm text-fg-subtle mb-8">Test the waters and prove the strategy in simulated conditions.</p>
          
          <ul className="space-y-4 text-sm text-fg-muted flex-1 mb-8">
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Paper Trading Only</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> 1 Connected Account</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> 1 Active Bot</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Standard Analytics</li>
          </ul>
        </div>

        {/* Trader Tier */}
        <div className="rounded-[var(--radius-card)] border border-accent bg-accent/5 p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-accent" />
          <h3 className="text-xl font-semibold text-fg mb-2">Trader</h3>
          <div className="text-3xl font-bold text-fg mb-6">$29<span className="text-base font-normal text-fg-muted">/mo</span></div>
          <p className="text-sm text-fg-subtle mb-8">For individuals ready to execute live with automated risk controls.</p>
          
          <ul className="space-y-4 text-sm text-fg-muted flex-1 mb-8">
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> <strong>Live Broker Execution</strong></li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> 3 Connected Accounts</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> 3 Active Bots</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Discord Webhook Alerts</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Priority Support</li>
          </ul>
        </div>

        {/* Pro Tier */}
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 flex flex-col">
          <h3 className="text-xl font-semibold text-fg mb-2 flex items-center gap-2">Pro <Star size={16} className="text-warning" weight="fill" /></h3>
          <div className="text-3xl font-bold text-fg mb-6">$79<span className="text-base font-normal text-fg-muted">/mo</span></div>
          <p className="text-sm text-fg-subtle mb-8">For advanced systematic traders managing multiple strategies.</p>
          
          <ul className="space-y-4 text-sm text-fg-muted flex-1 mb-8">
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Live Broker Execution</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Unlimited Accounts</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Unlimited Bots</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Copy-Trading (Signal Router)</li>
            <li className="flex gap-3 items-center"><Check size={16} className="text-accent" /> Full API Access</li>
          </ul>
        </div>

      </motion.section>

    </div>
  );
}
