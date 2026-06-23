import type { Metadata } from "next";
import { StrategyLab } from "@/components/dashboard/strategy-lab";
import { AIOptimizer } from "@/components/dashboard/ai-optimizer";
import { Card } from "@/components/ui/card";
import { getStrategyData } from "@/lib/queries";
import { DashboardError } from "@/components/dashboard/states";

export const metadata: Metadata = { title: "Strategy Lab" };

export default async function StrategyPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const data = await getStrategyData(searchParams.account);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Strategy Lab</h1>
        <p className="text-sm text-fg-subtle">
          Tune the rules within safe bounds. Every change is logged.
        </p>
      </div>
      
      {data.accountId && <AIOptimizer activeAccountId={data.accountId} />}

      {data.error ? (
        <DashboardError title="Strategy lab unavailable" message="We couldn't load your active strategies or parameters. Please try again." />
      ) : data.hasStrategy && data.params ? (
        <StrategyLab
          initialParams={data.params}
          changeLog={data.changeLog}
          pending={data.pending}
          autoAdjustmentsUsed={data.autoAdjustmentsUsed}
          plan={data.plan}
        />
      ) : (
        <Card className="p-10 text-center">
          <p className="text-sm text-fg-muted">No strategy yet</p>
          <p className="mt-1 text-xs text-fg-subtle">
            Finish onboarding to create your ORB strategy, then tune it here.
          </p>
        </Card>
      )}
    </div>
  );
}
