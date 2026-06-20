import type { Metadata } from "next";
import { JournalView } from "@/components/dashboard/journal-view";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Journal</h1>
        <p className="text-sm text-fg-subtle">
          Daily P&L and a record of every trade with the bot’s reasoning.
        </p>
      </div>
      <JournalView />
    </div>
  );
}
