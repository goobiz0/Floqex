import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { StrategyLab } from "@/components/dashboard/strategy-lab";
import { ValidationLab } from "@/components/dashboard/validation-lab";
import { AIOptimizer } from "@/components/dashboard/ai-optimizer";
import { Card } from "@/components/ui/card";
import { getStrategyData } from "@/lib/queries";
import { DashboardError } from "@/components/dashboard/states";
import Link from "next/link";
import { MagicWand, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import AIStrategyBuilder from "@/components/dashboard/ai-strategy-builder";
import { NewStrategyButton } from "@/components/dashboard/new-strategy-button";
import { NewStrategyFlow } from "@/components/dashboard/new-strategy-flow";
import { StrategyHubGrid, type HubStrategy } from "@/components/dashboard/strategy-hub-grid";

export const metadata: Metadata = { title: "Strategy Management" };

export default async function StrategyPage(props: { searchParams: Promise<{ account?: string, view?: string, strategyId?: string }> }) {
  const searchParams = await props.searchParams;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // If view is 'new', render the full strategy creation flow (template vs. own).
  if (searchParams.view === 'new') {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { plan: true },
    });
    return (
      <div className="max-w-5xl mx-auto p-6 lg:p-10">
        <NewStrategyFlow plan={user?.plan ?? "FREE"} />
      </div>
    );
  }

  // If view is 'builder', render the AI builder
  if (searchParams.view === 'builder') {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-6 lg:p-10">
        <Link href="/dashboard/strategy" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors">
          <ArrowLeft size={16} /> Back to Strategies
        </Link>
        <AIStrategyBuilder />
      </div>
    );
  }

  // If view is 'edit', render the specific strategy lab
  if (searchParams.view === 'edit') {
    const data = await getStrategyData(searchParams.account, searchParams.strategyId);
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-6 lg:p-10">
        <Link href="/dashboard/strategy" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors">
          <ArrowLeft size={16} /> Back to Strategies
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Strategy Tuning</h1>
          <p className="text-sm text-fg-subtle mt-1">
            Tune the rules within safe bounds. Every change is logged.
          </p>
        </div>

        {data.accountId && <AIOptimizer activeAccountId={data.accountId} />}

        {data.error ? (
          <DashboardError title="Strategy lab unavailable" message="We couldn't load your active strategies or parameters. Please try again." />
        ) : data.hasStrategy && data.params ? (
          <>
            <StrategyLab
              initialParams={data.params}
              changeLog={data.changeLog}
              pending={data.pending}
              autoAdjustmentsUsed={data.autoAdjustmentsUsed}
              plan={data.plan}
              accountId={data.accountId}
              strategyId={data.strategyId}
              kind={data.kind}
            />
            <div className="pt-2">
              <ValidationLab
                strategyId={data.strategyId}
                instrument={typeof data.params.instrument === "string" && data.params.instrument ? data.params.instrument : "NQ"}
                defaults={{
                  riskPct: typeof data.params.riskPct === "number" ? data.params.riskPct : 1,
                  rrTarget: typeof data.params.rrTarget === "number" ? data.params.rrTarget : 2,
                  stopLossPct: typeof data.params.stopLossPct === "number" ? data.params.stopLossPct : 0.5,
                  trendFilter: Boolean(data.params.trendFilter),
                  direction: data.params.direction === "SHORT" ? "SHORT" : data.params.direction === "LONG" ? "LONG" : "BOTH",
                  minRange: typeof data.params.minRange === "number" ? data.params.minRange : 0.1,
                  maxRange: typeof data.params.maxRange === "number" ? data.params.maxRange : 5,
                }}
              />
            </div>
          </>
        ) : (
          <Card className="p-10 text-center">
            <p className="text-sm text-fg-muted">No strategy found</p>
          </Card>
        )}
      </div>
    );
  }

  // Otherwise, render the list of all strategies
  const strategies = await prisma.strategy.findMany({
    where: { user: { clerkId: userId } },
    include: {
      bots: {
        include: { account: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Serialize to client-safe shape, reading edgeScore/edgeVerdict from params JSON.
  const serialized: HubStrategy[] = strategies.map((strategy) => {
    const p = (strategy.params ?? {}) as Record<string, unknown>;
    return {
      id: strategy.id,
      name: strategy.name,
      kind: strategy.kind,
      version: strategy.version,
      edgeScore: typeof p.edgeScore === "number" ? Math.round(p.edgeScore) : null,
      edgeVerdict: typeof p.edgeVerdict === "string" ? p.edgeVerdict : null,
      bots: strategy.bots.map((bot) => ({
        id: bot.id,
        status: bot.status,
        accountId: bot.accountId ?? null,
        nickname: bot.account?.nickname ?? "No Account",
      })),
    };
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Strategy Hub</h1>
          <p className="text-fg-muted mt-1 text-sm">Manage your trading logic and view assigned accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/strategy?view=builder" className="relative group inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-[var(--radius-pill)] text-sm font-medium text-accent hover:bg-accent/20 transition-all hover:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.3)] hover:-translate-y-[1px]">
            <MagicWand size={16} weight="fill" />
            AI Generate
          </Link>
          <NewStrategyButton />
        </div>
      </div>

      <StrategyHubGrid strategies={serialized} />
    </div>
  );
}
