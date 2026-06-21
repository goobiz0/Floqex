import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUp, ArrowDown, ArrowRight, RocketLaunch } from "@phosphor-icons/react/dist/ssr";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EquityCurve } from "@/components/dashboard/equity-curve";
import { LivePosition } from "@/components/dashboard/live-position";
import { AgentFeed } from "@/components/dashboard/agent-feed";
import { getOverviewData } from "@/lib/queries";
import { summaryMetrics, equitySeries, maxDrawdown } from "@/lib/metrics";
import { cn, formatUSD } from "@/lib/utils";
import { onboardingUrl } from "@/lib/urls";
import { DashboardError } from "@/components/dashboard/states";

export const metadata: Metadata = { title: "Dashboard" };

const statusMeta = {
  RUNNING: { tone: "positive" as const, label: "Running", pulse: true },
  WAITING: { tone: "warning" as const, label: "Waiting", pulse: false },
  STOPPED: { tone: "neutral" as const, label: "Stopped", pulse: false },
};

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function DashboardPage() {
  const data = await getOverviewData();

  if (data.error) return <DashboardError />;

  // No account yet — a brand-new user sees a real, composed empty state, never fake numbers.
  if (!data.account) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] bg-accent-soft text-accent">
          <RocketLaunch size={24} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Welcome to Floqex</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Connect a paper account and activate your bot. Your equity, journal, and analytics fill
          in automatically as it trades.
        </p>
        <Button href={onboardingUrl()} size="lg" className="mt-6">
          Start onboarding
        </Button>
      </div>
    );
  }

  const m = summaryMetrics(data.trades);
  const series = equitySeries(data.summaries);
  const dd = maxDrawdown(series);
  const today = data.summaries[data.summaries.length - 1] ?? null;
  const start = data.summaries[0]?.startBalance ?? data.account.balance;
  const profitFactor = m.count
    ? Number.isFinite(m.profitFactor)
      ? m.profitFactor.toFixed(2)
      : "∞"
    : "—";

  const metrics: { label: string; value: string; tone?: "positive" | "negative" }[] = [
    { label: "Win rate", value: m.count ? `${m.winRate.toFixed(1)}%` : "—" },
    { label: "Profit factor", value: profitFactor },
    {
      label: "Total P&L",
      value: m.count ? formatUSD(m.total, { sign: true }) : "—",
      tone: m.count ? (m.total >= 0 ? "positive" : "negative") : undefined,
    },
    {
      label: "Expectancy",
      value: m.count ? `${m.expectancy >= 0 ? "+" : ""}${m.expectancy.toFixed(2)}R` : "—",
    },
    {
      label: "Max drawdown",
      value: series.length ? `${dd.pct.toFixed(1)}%` : "—",
      tone: series.length ? "negative" : undefined,
    },
    { label: "Trades", value: String(m.count) },
  ];

  const recent = data.trades.slice(0, 5);
  const bot = data.bot ? statusMeta[data.bot.status] : null;
  const openPosition = data.openTrade
    ? {
        instrument: data.openTrade.instrument,
        direction: data.openTrade.direction,
        entry: data.openTrade.entryPrice,
        stop: data.openTrade.stopPrice,
        target: data.openTrade.targetPrice,
      }
    : null;

  const mockEntries = data.bot?.status === "RUNNING" ? [
    { t: "09:30:00", text: "Session open. Scanning NY open volatility...", tone: "warn" as const },
    { t: "09:31:12", text: "Detected volume spike on ES futures. Analysing ORB range." },
    { t: "09:35:05", text: "5-minute ORB range established at 5120.50 - 5132.25." },
    { t: "09:42:18", text: "Price action pushing top of range. Awaiting breakout confirmation." },
    { t: "09:45:00", text: "Confirmed breakout above 5132.25. Executing LONG order.", tone: "in" as const },
    { t: "09:45:02", text: "Order filled at 5133.00. Stop placed at 5120.00 (1R = 13pts)." },
    { t: "10:15:30", text: "Target 1 reached (5146.00). Trailing stop activated.", tone: "out" as const },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Overview</h1>
          <p className="text-sm text-fg-subtle">
            {data.account.nickname} · {data.account.mode === "PAPER" ? "Paper" : "Live"}
          </p>
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
              {formatUSD(data.account.balance)}
            </span>
            {today ? (
              <Badge tone={today.netPnl >= 0 ? "positive" : "negative"} mono>
                {formatUSD(today.netPnl, { sign: true })}
                {today.startBalance
                  ? ` · ${today.netPnl >= 0 ? "+" : ""}${((today.netPnl / today.startBalance) * 100).toFixed(2)}%`
                  : ""}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-fg-subtle">
            {today ? "Since yesterday’s close" : "No trading activity yet"} · started at{" "}
            {formatUSD(start)}
          </p>
        </Card>

        {/* Bot status */}
        <Card className="flex flex-col justify-between p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <CardTitle>Bot status</CardTitle>
            {bot ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-fg">
                <StatusDot tone={bot.tone} pulse={bot.pulse} />
                {bot.label}
              </span>
            ) : (
              <span className="text-sm text-fg-subtle">Not set up</span>
            )}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-subtle">Account</dt>
              <dd className="text-fg">{data.account.broker}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-subtle">Trades today</dt>
              <dd className="tnum text-fg">{today?.tradeCount ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-subtle">Last heartbeat</dt>
              <dd className="text-fg">
                {data.bot?.lastHeartbeat ? fmtWhen(data.bot.lastHeartbeat) : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Equity curve */}
        <Card className="p-6 lg:col-span-8">
          <CardTitle>Equity curve</CardTitle>
          <div className="mt-4">
            <EquityCurve series={series} />
          </div>
        </Card>

        {/* Live position */}
        <div className="lg:col-span-4">
          <LivePosition position={openPosition} />
        </div>

        {/* Metrics row */}
        <div className="lg:col-span-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </div>

        {/* Agent feed */}
        <Card className="p-5 lg:col-span-8">
          <CardTitle>Agent feed</CardTitle>
          <div className="mt-3">
            <AgentFeed entries={mockEntries} />
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
          {recent.length ? (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((t) => {
                const long = t.direction === "LONG";
                const win = (t.netPnl ?? 0) >= 0;
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-[6px]",
                        long ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
                      )}
                    >
                      {long ? (
                        <ArrowUp size={13} weight="bold" />
                      ) : (
                        <ArrowDown size={13} weight="bold" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg">{t.instrument}</p>
                      <p className="text-xs text-fg-subtle">{fmtWhen(t.closedAt ?? t.openedAt)}</p>
                    </div>
                    <span
                      className={cn(
                        "tnum ml-auto text-sm font-medium",
                        win ? "text-positive" : "text-negative",
                      )}
                    >
                      {formatUSD(t.netPnl ?? 0, { sign: true })}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-3 flex flex-1 items-center justify-center py-8 text-center text-sm text-fg-subtle">
              No trades yet.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
