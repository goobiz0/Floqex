import type { Metadata } from "next";
import { getTradeData } from "@/lib/queries";
import { timeOfWeekAttribution, instrumentAttribution } from "@/lib/metrics";
import { DashboardError } from "@/components/dashboard/states";
import { Card } from "@/components/ui/card";
import { AttributionCharts } from "./attribution-charts";

export const metadata: Metadata = { title: "Attribution Analytics" };

export default async function AttributionPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const { hasAccount, trades, error } = await getTradeData(searchParams.account);

  const header = (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-fg">Performance Attribution</h1>
      <p className="text-sm text-fg-subtle">
        Multidimensional breakdown of edge by time and instrument.
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

  const closedTrades = trades.filter((t) => t.status === "CLOSED");

  if (!closedTrades.length) {
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

  const timeData = timeOfWeekAttribution(trades);
  const instrumentData = instrumentAttribution(trades);

  return (
    <div className="space-y-4">
      {header}
      <AttributionCharts timeData={timeData} instrumentData={instrumentData} />
    </div>
  );
}
