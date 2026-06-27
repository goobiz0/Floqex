import type { Metadata } from "next";
import { getCopyTradingData } from "@/lib/queries";
import { CopyTradingView } from "@/components/dashboard/copy-trading-view";
import { CopyTradingPaywall } from "@/components/dashboard/copy-trading-paywall";
import { DashboardError } from "@/components/dashboard/states";

export const metadata: Metadata = { title: "Copy Trading" };

export default async function CopyTradingPage() {
  const data = await getCopyTradingData();

  if (data.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Copy Trading</h1>
        <DashboardError
          title="Copy trading unavailable"
          message="We could not load your copy trading setup. Please refresh and try again."
        />
      </div>
    );
  }

  // Hard block: an unentitled plan never gets the functional surface or any
  // account data, only the upsell.
  if (!data.entitled) {
    return <CopyTradingPaywall plan={data.plan} />;
  }

  return <CopyTradingView data={data} />;
}
