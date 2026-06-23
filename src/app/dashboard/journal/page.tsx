import type { Metadata } from "next";
import { JournalView } from "@/components/dashboard/journal-view";
import { Card } from "@/components/ui/card";
import { getTradeData } from "@/lib/queries";
import { DashboardError } from "@/components/dashboard/states";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const { hasAccount, trades, summaries, error } = await getTradeData(searchParams.account);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Journal</h1>
        <p className="text-sm text-fg-subtle">
          Daily P&L and a record of every trade with the bot’s reasoning.
        </p>
      </div>
      {error ? (
        <DashboardError title="Trade journal unavailable" message="We couldn't retrieve your trade history. Your database connection might be temporarily down." />
      ) : hasAccount ? (
        <JournalView trades={trades} summaries={summaries} />
      ) : (
        <Card className="p-10 text-center">
          <p className="text-sm text-fg-muted">No account yet</p>
          <p className="mt-1 text-xs text-fg-subtle">Your trade journal fills in as the bot trades.</p>
        </Card>
      )}
    </div>
  );
}
