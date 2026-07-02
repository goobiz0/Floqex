import type { Metadata } from "next";
import { JournalView } from "@/components/dashboard/journal-view";
import { Card } from "@/components/ui/card";
import { getTradeData, ALL_ACCOUNTS_ID } from "@/lib/queries";
import { DashboardError } from "@/components/dashboard/states";
import { AllAccountsBadge } from "@/components/dashboard/all-accounts-badge";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const { hasAccount, trades, summaries, error } = await getTradeData(searchParams.account);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-fg">Journal</h1>
          {searchParams.account === ALL_ACCOUNTS_ID && <AllAccountsBadge />}
        </div>
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
