"use client";

import { ShieldCheck, Info, Key, CheckCircle, Warning, LockKey, TerminalWindow, Bank } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";

export default function BrokersPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
      <motion.header variants={itemVariants} className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <Key size={14} weight="duotone" />
          Live Execution
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-fg">Brokers & Connections</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed max-w-2xl">
          Transitioning from Paper to Live trading requires connecting a supported brokerage account. Floqex uses secure, encrypted API keys to execute trades directly on your behalf without ever touching your funds.
        </p>
      </motion.header>

      <motion.section variants={itemVariants} className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Supported Integrations</h2>
        <div className="grid gap-6 mt-6 sm:grid-cols-2">
          
          <div className="rounded-[var(--radius-card)] border border-accent/50 bg-surface p-8 shadow-[0_0_30px_rgba(var(--color-accent),0.05)] relative overflow-hidden flex flex-col items-center text-center transition-transform hover:scale-[1.02] duration-300">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-accent" />
            <div className="h-20 w-20 rounded-2xl bg-[#FCD535]/10 flex items-center justify-center text-[#FCD535] mb-5 shadow-inner">
              <span className="font-bold text-4xl drop-shadow-md">🦙</span>
            </div>
            <h3 className="text-2xl font-semibold text-fg">Alpaca Markets</h3>
            <p className="mt-3 text-sm text-fg-subtle leading-relaxed max-w-sm">
              Commission-free API trading. Best for US Equities. We fully support Alpaca's REST v2 API, including OCO (One-Cancels-Other) bracket orders and fractional shares.
            </p>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-positive bg-positive/10 px-4 py-2 rounded-full border border-positive/20">
              <CheckCircle size={18} weight="fill" /> Fully Supported & Tested
            </div>
          </div>
          
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 shadow-sm flex flex-col items-center text-center opacity-80 grayscale-[30%] transition-transform hover:scale-[1.02] duration-300">
            <div className="h-20 w-20 rounded-2xl bg-fg/5 border border-line flex items-center justify-center text-fg mb-5 shadow-inner">
              <span className="font-bold text-3xl tracking-tighter">TS</span>
            </div>
            <h3 className="text-2xl font-semibold text-fg">TradeStation</h3>
            <p className="mt-3 text-sm text-fg-subtle leading-relaxed max-w-sm">
              Advanced institutional-grade routing for Equities and Futures. Deep integration is currently in beta testing for our professional users.
            </p>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warning bg-warning/10 px-4 py-2 rounded-full border border-warning/20">
              <Warning size={18} weight="fill" /> Private Beta Access Only
            </div>
          </div>
        </div>
      </motion.section>

      {/* Security Architecture */}
      <motion.section variants={itemVariants} className="space-y-6 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">How We Secure Your Keys</h2>
        <div className="bg-surface rounded-[var(--radius-card)] border border-line overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
            <ShieldCheck size={240} weight="fill" />
          </div>
          <div className="p-6 md:p-10 space-y-8 relative z-10">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="h-14 w-14 shrink-0 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">
                <LockKey size={28} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-fg">AES-256-GCM Encryption</h3>
                <p className="text-sm text-fg-subtle leading-relaxed max-w-2xl">
                  The moment you paste your API keys into the dashboard, they are encrypted client-side and then re-encrypted at rest in our database using industry-standard AES-256-GCM. Our front-end cannot read your keys once they are saved.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="h-14 w-14 shrink-0 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">
                <TerminalWindow size={28} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-fg">In-Memory Decryption</h3>
                <p className="text-sm text-fg-subtle leading-relaxed max-w-2xl">
                  Keys are only ever decrypted in-memory inside the secure execution enclave at the exact moment a trade signal is generated. They are never logged or stored in plain text anywhere on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="space-y-6 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Connection Guide (Alpaca)</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 bg-base border border-line p-5 rounded-[var(--radius-card)] hover:border-accent/30 transition-colors">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-surface border border-line flex items-center justify-center font-mono text-base font-bold text-fg shadow-sm">1</div>
            <div className="pt-2">
              <strong className="text-fg block text-lg mb-1">Upgrade to Trader Plan</strong>
              <span className="text-sm text-fg-subtle leading-relaxed block">Live broker connections are only available on paid tiers. Navigate to Billing to upgrade your account to enable live execution.</span>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-base border border-line p-5 rounded-[var(--radius-card)] hover:border-accent/30 transition-colors">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-surface border border-line flex items-center justify-center font-mono text-base font-bold text-fg shadow-sm">2</div>
            <div className="pt-2">
              <strong className="text-fg block text-lg mb-1">Generate API Keys</strong>
              <span className="text-sm text-fg-subtle leading-relaxed block">Log into your Alpaca dashboard. Create new keys. <strong className="text-negative bg-negative/10 px-1.5 py-0.5 rounded ml-1">Crucial: Ensure keys have Trade permissions but NO Transfer/Withdrawal permissions.</strong></span>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-base border border-line p-5 rounded-[var(--radius-card)] hover:border-accent/30 transition-colors">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-surface border border-line flex items-center justify-center font-mono text-base font-bold text-fg shadow-sm">3</div>
            <div className="pt-2">
              <strong className="text-fg block text-lg mb-1">Paste into Floqex</strong>
              <span className="text-sm text-fg-subtle leading-relaxed block">Go to the Accounts Dashboard. Click "Connect Live Account" and input your newly generated Key ID and Secret.</span>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
