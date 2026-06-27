import type { Metadata } from "next";
import { getBotsData } from "@/lib/queries";
import { BotsView } from "@/components/dashboard/bots-view";
import { DashboardError } from "@/components/dashboard/states";

export const metadata: Metadata = { title: "Bots" };

export default async function BotsPage() {
  const data = await getBotsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Bots</h1>
        <p className="text-sm text-fg-subtle">
          Manage your automated trading bots. Connect a bot to a broker account to start trading.
        </p>
      </div>
      {data.error ? <DashboardError /> : <BotsView bots={data.bots} availableAccounts={data.availableAccounts} plan={data.plan} forwardTests={data.forwardTests} />}
    </div>
  );
}
