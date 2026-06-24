import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { HBars, VBars, Histogram, LineMini } from "@/components/dashboard/charts";
import { getTradeData } from "@/lib/queries";
import {
  summaryMetrics,
  byInstrument,
  bySession,
  byWeekday,
  rDistribution,
  rollingWinRate,
} from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import { DashboardError } from "@/components/dashboard/states";

export const metadata: Metadata = { title: "Analytics" };

const usd0 = (n: number) => formatUSD(n).replace(".00", "");

export default async function AnalyticsPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const { hasAccount, trades, error } = await getTradeData(searchParams.account);
  const m = summaryMetrics(trades);

  const header = (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-fg">Analytics</h1>
      <p className="text-sm text-fg-subtle">
        Where the edge comes from, broken down by instrument and session.
      </p>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {header}
        <DashboardError title="Analytics unavailable" message="We couldn't load your performance metrics. Ensure your accounts are active." />
      </div>
    );
  }

  if (!m.count) {
    return (
      <div className="space-y-4">
        {header}
        <Card className="p-10 text-center">
          <p className="text-sm text-fg-muted">
            {hasAccount ? "Not enough data yet" : "No account yet"}
          </p>
          <p className="mt-1 text-xs text-fg-subtle">
            Analytics populate once your bot has closed some trades.
          </p>
        </Card>
      </div>
    );
  }

  const instr = byInstrument(trades);
  const sess = bySession(trades);
  const wd = byWeekday(trades);
  const roll = rollingWinRate([...trades].reverse()); // trades are newest-first

  return (
    <div className="space-y-4">
      {header}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total P&L"
          value={<DisplayValue money={m.total} percent={summaries[0]?.startBalance ? (m.total / summaries[0].startBalance) * 100 : undefined} />}
          tone={m.total >= 0 ? "positive" : "negative"}
        />
        <MetricCard label="Win rate" value={`${m.winRate.toFixed(1)}%`} />
        <MetricCard
          label="Profit factor"
          value={Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : "∞"}
        />
        <MetricCard label="Trades" value={String(m.count)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardTitle>P&L by instrument</CardTitle>
          <div className="mt-5">
            <HBars
              data={Object.entries(instr).map(([label, value]) => ({ label, value }))}
              format={usd0}
            />
          </div>
        </Card>

        <Card className="p-5">
          <CardTitle>P&L by session</CardTitle>
          <div className="mt-5">
            <VBars
              data={[
                { label: "Asia", value: sess.ASIA },
                { label: "New York", value: sess.NY },
              ]}
              format={usd0}
            />
          </div>
        </Card>

        <Card className="p-5">
          <CardTitle>P&L by day of week</CardTitle>
          <div className="mt-5">
            <VBars
              data={Object.entries(wd).map(([label, value]) => ({ label, value }))}
              format={usd0}
            />
          </div>
        </Card>

        <Card className="p-5">
          <CardTitle>R-multiple distribution</CardTitle>
          <div className="mt-5">
            <Histogram data={rDistribution(trades)} />
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <CardTitle>Win rate over time (rolling 10)</CardTitle>
          <div className="mt-5">
            {roll.length > 1 ? (
              <LineMini values={roll} />
            ) : (
              <p className="text-sm text-fg-subtle">Not enough trades yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
