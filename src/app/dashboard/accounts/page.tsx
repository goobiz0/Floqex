import type { Metadata } from "next";
import { AccountsView } from "@/components/dashboard/accounts-view";
import { DashboardError } from "@/components/dashboard/states";
import { getAccountsOverview } from "@/lib/queries";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const data = await getAccountsOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Accounts</h1>
        <p className="text-sm text-fg-subtle">
          Connect broker accounts and manage the bot, balance, and guardrails for each.
        </p>
      </div>

      {data.error ? (
        <DashboardError
          title="Accounts unavailable"
          message="We could not load your accounts right now. Please refresh in a moment, and check the database connection if this persists."
        />
      ) : (
        <AccountsView data={data} />
      )}
    </div>
  );
}
