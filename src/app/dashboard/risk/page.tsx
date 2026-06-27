import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { getPortfolioState } from "@/lib/engine/portfolio-risk";
import { PortfolioRiskView } from "@/components/dashboard/portfolio-risk-view";
import { DashboardError } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Portfolio Risk" };

export default async function RiskPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, plan: true } });
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface text-accent">
          <ShieldCheck size={20} weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Portfolio Risk</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            One view of risk across every bot, with a kill switch that stops the whole book at once.
          </p>
        </div>
      </div>

      {user.plan === "FREE" ? (
        <FreeUpsell />
      ) : (
        <RiskBody userId={user.id} />
      )}
    </div>
  );
}

async function RiskBody({ userId }: { userId: string }) {
  const state = await getPortfolioState(userId).catch((e) => {
    console.error("Portfolio state error:", e);
    return null;
  });
  if (!state) {
    return <DashboardError title="Portfolio risk unavailable" message="We could not assemble your portfolio view. Please try again." />;
  }
  return <PortfolioRiskView state={state} />;
}

function FreeUpsell() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-dashed border-line bg-surface/40 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
        <ShieldCheck size={24} weight="duotone" />
      </div>
      <div className="max-w-md">
        <h2 className="text-lg font-semibold text-fg">Run a book of bots</h2>
        <p className="mt-1.5 text-sm text-fg-subtle">
          Portfolio risk controls, the correlation matrix and the global kill switch unlock when you trade live across multiple accounts.
        </p>
      </div>
      <Button href="/dashboard/billing" size="sm">Upgrade to go live</Button>
      <Link href="/dashboard" className="text-xs font-medium text-fg-subtle hover:text-fg">Back to dashboard</Link>
    </div>
  );
}
