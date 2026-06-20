import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { HBars, VBars, Histogram, LineMini } from "@/components/dashboard/charts";
import {
  TRADES,
  summaryMetrics,
  byInstrument,
  bySession,
  byWeekday,
  rDistribution,
} from "@/lib/mock-data";
import { formatUSD } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

function rollingWinRate(window = 10): number[] {
  const out: number[] = [];
  for (let i = 0; i < TRADES.length; i++) {
    const slice = TRADES.slice(Math.max(0, i - window + 1), i + 1);
    const wins = slice.filter((t) => t.win).length;
    out.push((wins / slice.length) * 100);
  }
  return out;
}

const usd0 = (n: number) => formatUSD(n).replace(".00", "");

export default function AnalyticsPage() {
  const m = summaryMetrics();
  const instr = byInstrument();
  const sess = bySession();
  const wd = byWeekday();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Analytics</h1>
        <p className="text-sm text-fg-subtle">
          Where the edge comes from, broken down by instrument and session.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total P&L" value={formatUSD(m.total, { sign: true })} tone="positive" />
        <MetricCard label="Win rate" value={`${m.winRate.toFixed(1)}%`} />
        <MetricCard label="Profit factor" value={m.profitFactor.toFixed(2)} />
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
            <Histogram
              data={rDistribution().map((b) => ({ label: b.label, count: b.count }))}
            />
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <CardTitle>Win rate over time (rolling 10)</CardTitle>
          <div className="mt-5">
            <LineMini values={rollingWinRate()} />
          </div>
        </Card>
      </div>
    </div>
  );
}
