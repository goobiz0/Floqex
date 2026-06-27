import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { StrategyLab } from "@/components/dashboard/strategy-lab";
import { AIOptimizer } from "@/components/dashboard/ai-optimizer";
import { Card } from "@/components/ui/card";
import { getStrategyData } from "@/lib/queries";
import { DashboardError } from "@/components/dashboard/states";
import Link from "next/link";
import { Robot, Flask, MagicWand, ArrowLeft, Plus } from "@phosphor-icons/react/dist/ssr";
import AIStrategyBuilder from "@/components/dashboard/ai-strategy-builder";
import { StrategyDeleteButton } from "@/components/dashboard/strategy-delete-button";
import { NewStrategyButton } from "@/components/dashboard/new-strategy-button";
import { NewStrategyFlow } from "@/components/dashboard/new-strategy-flow";

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
          <StrategyLab
            initialParams={data.params}
            changeLog={data.changeLog}
            pending={data.pending}
            autoAdjustmentsUsed={data.autoAdjustmentsUsed}
            plan={data.plan}
            accountId={data.accountId}
            strategyId={data.strategyId}
          />
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {strategies.map(strategy => (
          <div key={strategy.id} id={`strategy-card-${strategy.id}`} className="group relative flex flex-col p-6 rounded-[var(--radius-card)] bg-surface border border-line hover:border-line-strong transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-hover border border-line flex items-center justify-center text-fg">
                  <Flask size={20} weight="duotone" />
                </div>
                <div>
                  <h3 className="font-bold text-fg text-lg">{strategy.name}</h3>
                  <p className="text-xs text-fg-subtle uppercase tracking-widest">{strategy.kind} • v{strategy.version}</p>
                </div>
              </div>
              <StrategyDeleteButton
                strategyId={strategy.id}
                strategyName={strategy.name}
                hasBots={strategy.bots.length > 0}
              />
            </div>
            
            <div className="relative z-10 flex-1 mt-2 mb-6">
              <h4 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Assigned To</h4>
              {strategy.bots.length > 0 ? (
                <div className="space-y-2">
                  {strategy.bots.map(bot => (
                    <div key={bot.id} className="flex items-center gap-2 text-sm text-fg bg-base/50 p-2 rounded-[var(--radius-control)] border border-line">
                      <Robot size={16} weight="duotone" className="text-fg-subtle shrink-0" />
                      <span className="font-medium truncate">{bot.account?.nickname ?? "No Account"}</span>
                      <span className={`ml-auto text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-[var(--radius-pill)] uppercase shrink-0 ${bot.status === 'RUNNING' ? 'bg-profit/10 text-profit' : 'bg-surface border border-line text-fg-subtle'}`}>
                        {bot.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-fg-subtle italic flex items-center gap-2 bg-base/50 p-2 rounded-[var(--radius-control)] border border-transparent">
                  <span className="h-1.5 w-1.5 rounded-full bg-fg-muted" /> No accounts assigned
                </p>
              )}
            </div>

            <div className="relative z-10 mt-auto pt-4 border-t border-line/50">
              <Link
                href={`/dashboard/strategy?view=edit${strategy.bots[0] ? `&account=${strategy.bots[0].accountId}` : `&strategyId=${strategy.id}`}`}
                className="block w-full text-center py-2.5 text-sm font-semibold bg-surface-hover hover:bg-base rounded-[var(--radius-control)] transition-all hover:-translate-y-[1px] text-fg border border-transparent hover:border-line"
              >
                Tune Parameters
              </Link>
            </div>
          </div>
        ))}
        {strategies.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-line rounded-[var(--radius-card)] bg-surface/30">
            <div className="h-16 w-16 rounded-full bg-surface border border-line flex items-center justify-center text-fg-subtle mb-6">
              <Flask size={32} weight="duotone" />
            </div>
            <h3 className="text-lg font-bold text-fg mb-2">No strategies defined</h3>
            <p className="text-sm text-fg-subtle text-center max-w-md mb-6">
              You haven&apos;t created any trading algorithms yet. Start from a curated template, write your own logic, or let AI draft one for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link href="/dashboard/strategy?view=new" className="relative group inline-flex items-center gap-2 px-6 py-3 bg-accent border border-accent/50 rounded-[var(--radius-pill)] text-sm font-bold text-base transition-all hover:shadow-[0_0_30px_rgba(var(--color-accent-rgb),0.4)] hover:-translate-y-[1px]">
                <Plus size={18} weight="bold" className="text-base" />
                Create a strategy
              </Link>
              <Link href="/dashboard/strategy?view=builder" className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-line rounded-[var(--radius-pill)] text-sm font-semibold text-fg transition-all hover:border-line-strong hover:-translate-y-[1px]">
                <MagicWand size={18} weight="fill" className="text-accent" />
                Generate with AI
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
