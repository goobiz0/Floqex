"use client";

import { motion } from "motion/react";
import { Bank, LockKey, GlobeHemisphereWest, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

export default function BrokersPage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Brokers & Connections
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Floqex connects directly to your brokerage account via API, functioning as a non-custodial execution layer. Your funds remain at your broker.
        </p>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <h2 className="text-2xl font-semibold text-fg">Supported Brokers</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center p-2 shadow-sm">
              <span className="text-black font-bold text-lg">A</span>
            </div>
            <h3 className="font-semibold text-fg">Alpaca</h3>
            <p className="text-xs text-fg-muted">Equities & Crypto. Full API support, ideal for automated trading.</p>
            <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-profit bg-profit/10 px-2 py-0.5 rounded-full">
              Supported
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center space-y-3 opacity-60 grayscale">
            <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center p-2 shadow-sm">
              <span className="text-blue-600 font-bold text-lg">TS</span>
            </div>
            <h3 className="font-semibold text-fg">TradeStation</h3>
            <p className="text-xs text-fg-muted">Equities, Options & Futures. Institutional-grade execution.</p>
            <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-fg-subtle bg-line px-2 py-0.5 rounded-full">
              Coming Q4
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center space-y-3 opacity-60 grayscale">
            <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center p-2 shadow-sm">
              <span className="text-orange-500 font-bold text-lg">O</span>
            </div>
            <h3 className="font-semibold text-fg">OANDA</h3>
            <p className="text-xs text-fg-muted">Forex and CFDs. Global market access.</p>
            <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-fg-subtle bg-line px-2 py-0.5 rounded-full">
              Coming Q4
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-semibold text-fg">Paper vs. Live Trading</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-medium text-fg flex items-center gap-2"><GlobeHemisphereWest size={20} className="text-fg-muted" /> Paper Execution</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Every free account comes with an integrated Floqex Paper broker. This utilizes real-time market data (via Yahoo Finance feeds) and simulates fills with a hardcoded 0.02% slippage penalty to reflect realistic conditions. Use paper trading to test strategies and build confidence before risking real capital.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-fg flex items-center gap-2"><Bank size={20} className="text-accent" /> Live Execution</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Available on the Trader and Pro tiers, live execution routes orders directly to your connected broker via API. Floqex requires trade execution permissions only—we cannot and will never request withdrawal or transfer permissions.
            </p>
          </div>
        </div>
      </motion.section>
      
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6 border-t border-line pt-12"
      >
        <div className="flex items-center gap-3 mb-4">
          <LockKey size={24} className="text-accent" />
          <h2 className="text-2xl font-semibold text-fg">API Security Architecture</h2>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 space-y-4">
          <p className="text-sm text-fg-muted leading-relaxed">
            Your broker API keys are never stored in plaintext and never transmitted to the client application.
          </p>
          <ul className="space-y-3 text-sm text-fg-subtle">
            <li className="flex gap-3 items-start"><CheckCircle size={16} className="text-profit mt-0.5 shrink-0" /> <strong>AES-256-GCM Encryption:</strong> Keys are encrypted at the server edge before being persisted to the database.</li>
            <li className="flex gap-3 items-start"><CheckCircle size={16} className="text-profit mt-0.5 shrink-0" /> <strong>Ephemeral Decryption:</strong> Keys are decrypted only within the isolated execution engine exactly at the moment an order payload is formatted, and immediately garbage collected.</li>
            <li className="flex gap-3 items-start"><CheckCircle size={16} className="text-profit mt-0.5 shrink-0" /> <strong>Zero-Trust Client:</strong> The browser never receives your API secrets back after submission.</li>
          </ul>
        </div>
      </motion.section>

    </div>
  );
}
