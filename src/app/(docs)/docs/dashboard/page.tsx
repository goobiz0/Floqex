"use client";

import { motion } from "motion/react";
import { Layout, ChartLineUp, Flask, ChartBar, Receipt, Gear } from "@phosphor-icons/react/dist/ssr";

export default function DashboardGuidePage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Dashboard Guide
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          The Floqex dashboard is your command center. It provides real-time oversight of your bots, equity curve, and strategic adjustments.
        </p>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <div className="grid gap-6">
          
          <div className="flex gap-4 p-6 rounded-[var(--radius-card)] border border-line bg-surface">
            <div className="shrink-0 mt-1 h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Layout size={20} weight="fill" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg mb-2">Overview</h3>
              <p className="text-sm text-fg-muted leading-relaxed">
                The primary view. Monitor your aggregate equity curve, today&apos;s P&L, bot heartbeat status, and the live Agent Feed (a play-by-play narration of the bot&apos;s decisions).
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-[var(--radius-card)] border border-line bg-surface">
            <div className="shrink-0 mt-1 h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <ChartLineUp size={20} weight="fill" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg mb-2">Journal</h3>
              <p className="text-sm text-fg-muted leading-relaxed">
                Every trade is recorded immutably. View a calendar heatmap of daily performance, filter by date, and inspect individual trades. Each trade includes a chart screenshot capturing the exact entry, stop, and exit, along with MFE/MAE (Maximum Favorable/Adverse Excursion) data.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-[var(--radius-card)] border border-line bg-surface">
            <div className="shrink-0 mt-1 h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Flask size={20} weight="fill" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg mb-2">Strategy Lab</h3>
              <p className="text-sm text-fg-muted leading-relaxed">
                Configure your ORB parameters (range width filters, specific instruments). Here you will also find the <strong>Approval Queue</strong>, where the Evidence Loop proposes statistically significant optimizations for you to approve or reject.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-[var(--radius-card)] border border-line bg-surface">
            <div className="shrink-0 mt-1 h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <ChartBar size={20} weight="fill" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg mb-2">Analytics</h3>
              <p className="text-sm text-fg-muted leading-relaxed">
                Deep quantitative analysis of your trading history. View underwater drawdown curves, Win Rate vs. Profit Factor matrices, and R-distribution bell curves to understand your true edge.
              </p>
            </div>
          </div>

        </div>
      </motion.section>

    </div>
  );
}
