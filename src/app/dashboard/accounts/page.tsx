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
          title="Service Unavailable"
          message="We are currently unable to load your accounts. Please try refreshing the page in a few moments, or contact support if the issue persists."
        />
      ) : (
        <AccountsView data={data} />
      )}
    </div>
  );
}
