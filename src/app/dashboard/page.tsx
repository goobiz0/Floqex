import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUp, ArrowDown, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EquityCurve } from "@/components/dashboard/equity-curve";
import { LivePosition } from "@/components/dashboard/live-position";
import { AgentFeed } from "@/components/dashboard/agent-feed";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const METRICS = [
  { label: "Win rate", value: "58.3%" },
  { label: "Profit factor", value: "1.74" },
  { label: "Total P&L", value: "+$2,847.20", tone: "positive" as const },
  { label: "Avg R:R", value: "1.9" },
  { label: "Max drawdown", value: "6.2%", tone: "negative" as const },
  { label: "Expectancy", value: "+0.32R" },
];

const RECENT = [
  { when: "Today 09:52", asset: "Gold", long: true, pnl: "+$132.40", win: true },
  { when: "Wed 11:14", asset: "NQ", long: true, pnl: "+$96.10", win: true },
  { when: "Wed 09:38", asset: "Gold", long: false, pnl: "-$84.00", win: false },
  { when: "Tue 10:02", asset: "ES", long: true, pnl: "+$71.50", win: true },
  { when: "Mon 09:46", asset: "Gold", long: false, pnl: "-$83.20", win: false },
];

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Overview</h1>
          <p className="text-sm text-fg-subtle">Main account · Paper</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Equity hero */}
        <Card className="p-6 lg:col-span-8">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
            Account equity
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="tnum text-4xl font-semibold tracking-tight text-fg">
              $12,847.20
            </span>
            <Badge tone="positive" mono>
              +$232.10 · +1.84%
            </Badge>
          </div>
          <p className="mt-2 text-sm text-fg-subtle">
            Since yesterday’s close · started at $10,000.00
          </p>
        </Card>

        {/* Bot status */}
        <Card className="flex flex-col justify-between p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <CardTitle>Bot status</CardTitle>
            <span className="inline-flex items-center gap-1.5 text-sm text-fg">
              <StatusDot tone="positive" pulse />
              Running
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-subtle">Next session</dt>
              <dd className="text-fg">New York · 09:30 ET</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-subtle">Active instruments</dt>
              <dd className="text-fg">Gold, NQ, ES</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-subtle">Trades today</dt>
              <dd className="tnum text-fg">1 / 8</dd>
            </div>
          </dl>
        </Card>

        {/* Equity curve */}
        <Card className="p-6 lg:col-span-8">
          <CardTitle>Equity curve</CardTitle>
          <div className="mt-4">
            <EquityCurve />
          </div>
        </Card>

        {/* Live position */}
        <div className="lg:col-span-4">
          <LivePosition />
        </div>

        {/* Metrics row */}
        <div className="lg:col-span-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {METRICS.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>
        </div>

        {/* Agent feed */}
        <Card className="p-5 lg:col-span-8">
          <CardTitle>Agent feed</CardTitle>
          <div className="mt-3">
            <AgentFeed />
          </div>
        </Card>

        {/* Recent trades */}
        <Card className="flex flex-col p-5 lg:col-span-4">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Recent trades</CardTitle>
            <Link
              href="/dashboard/journal"
              className="inline-flex items-center gap-1 text-xs text-accent transition-colors hover:text-accent-hover"
            >
              View all
              <ArrowRight size={12} weight="bold" />
            </Link>
          </CardHeader>
          <ul className="mt-3 divide-y divide-line">
            {RECENT.map((r) => (
              <li key={r.when} className="flex items-center gap-3 py-2.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-[6px]",
                    r.long ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
                  )}
                >
                  {r.long ? <ArrowUp size={13} weight="bold" /> : <ArrowDown size={13} weight="bold" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{r.asset}</p>
                  <p className="text-xs text-fg-subtle">{r.when}</p>
                </div>
                <span
                  className={cn(
                    "tnum ml-auto text-sm font-medium",
                    r.win ? "text-positive" : "text-negative",
                  )}
                >
                  {r.pnl}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
