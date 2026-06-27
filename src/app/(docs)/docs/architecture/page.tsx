"use client";

import { motion } from "motion/react";
import { Database, LockKey, GlobeHemisphereWest, GitBranch } from "@phosphor-icons/react/dist/ssr";

export default function ArchitecturePage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Architecture & Security
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Floqex separates the execution engine from the web application. The database acts as the immutable contract between the two.
        </p>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <div className="grid gap-8 md:grid-cols-2">
          
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <GlobeHemisphereWest size={20} weight="fill" />
            </div>
            <h3 className="text-lg font-semibold text-fg">The Web Application</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              A Next.js 16 application hosted on Vercel. It provides the user interface across three subdomains: Marketing, Authentication (Clerk), and the Product Dashboard. The web app <strong>never executes trades</strong>. It only reads data and writes user configuration.
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Database size={20} weight="fill" />
            </div>
            <h3 className="text-lg font-semibold text-fg">The Postgres Contract</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Supabase Postgres sits between the web app and the engine. The web app writes bot configurations to the database. The engine reads these configurations, executes trades, and writes results back to the database.
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <GitBranch size={20} weight="fill" />
            </div>
            <h3 className="text-lg font-semibold text-fg">The Python Engine</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              An isolated Python worker running continuously. It polls the database for active bots, evaluates market conditions, applies the ORB logic and risk checks, and submits execution payloads to broker APIs.
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <LockKey size={20} weight="fill" />
            </div>
            <h3 className="text-lg font-semibold text-fg">Data Isolation (RLS)</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Live updates to the dashboard (agent feed, live P&L) are powered by Supabase Realtime. To ensure security, Row-Level Security (RLS) policies are enforced at the database level, using Clerk JWTs to guarantee that users can only subscribe to their own data streams.
            </p>
          </div>

        </div>
      </motion.section>

    </div>
  );
}
