import type { Metadata } from "next";
import { JournalView } from "@/components/dashboard/journal-view";
import { Card } from "@/components/ui/card";
import { getTradeData } from "@/lib/queries";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage() {
  const { hasAccount, trades, summaries } = await getTradeData();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Journal</h1>
        <p className="text-sm text-fg-subtle">
          Daily P&L and a record of every trade with the bot’s reasoning.
        </p>
      </div>
      {hasAccount ? (
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
