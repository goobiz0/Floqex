"use client";

import { motion } from "motion/react";
import { TerminalWindow, Plug, Link as LinkIcon, Code } from "@phosphor-icons/react/dist/ssr";

export default function ApiDocsPage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          API Documentation
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Interact with your Floqex bots and data programmatically. Available exclusively on the Pro tier.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
          <TerminalWindow size={14} />
          REST API v1
        </div>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-4">Authentication</h2>
        <p className="text-sm text-fg-muted leading-relaxed">
          All API requests must be authenticated using a Bearer token in the Authorization header. You can generate API keys from the Settings page in your dashboard.
        </p>
        <div className="rounded-md border border-line bg-base p-4 overflow-x-auto">
          <code className="text-sm font-mono text-fg-subtle">
            <span className="text-accent">Authorization:</span> Bearer flqx_live_xxxxxxxxxxxxxxxxxxxx
          </code>
        </div>
      </motion.section>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-4">Endpoints</h2>

        <div className="space-y-6">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-profit bg-profit/10 px-2 py-1 rounded">GET</span>
              <code className="font-mono text-sm text-fg">/v1/bots</code>
            </div>
            <p className="text-sm text-fg-muted leading-relaxed mb-4">List all bots attached to your account and their current status (RUNNING, STOPPED, WAITING).</p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded">POST</span>
              <code className="font-mono text-sm text-fg">/v1/bots/:id/stop</code>
            </div>
            <p className="text-sm text-fg-muted leading-relaxed mb-4">Issue a programmatic Emergency Stop to a specific bot. All open positions will be flattened.</p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-profit bg-profit/10 px-2 py-1 rounded">GET</span>
              <code className="font-mono text-sm text-fg">/v1/trades</code>
            </div>
            <p className="text-sm text-fg-muted leading-relaxed mb-4">Retrieve a paginated list of all executed trades, including MFE, MAE, and R-multiple data.</p>
          </div>
        </div>
      </motion.section>

    </div>
  );
}
