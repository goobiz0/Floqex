import type { Metadata } from "next";
import { SettingsView } from "@/components/dashboard/settings-view";
import { getTradeData } from "@/lib/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { trades } = await getTradeData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Settings</h1>
        <p className="text-sm text-fg-subtle">
          Notifications, alert thresholds, and data export.
        </p>
      </div>
      <SettingsView trades={trades} />
    </div>
  );
}
