import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getMochiUsage } from "@/lib/mochi-usage";
import { MOCHI_LIMITS, PLAN_ORDER, PLANS, type Plan } from "@/lib/plans";
import { MochiUsageCard } from "@/components/dashboard/mochi-usage-card";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Usage" };

const fmt = (n: number) => n.toLocaleString();

export default async function UsagePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, plan: true } });
  if (!user) redirect("/sign-in");

  const plan = user.plan as Plan;
  const usage = await getMochiUsage(user.id, plan);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Usage</h1>
          <p className="text-sm text-fg-subtle">Track your Mochi AI token usage against your plan&apos;s limits.</p>
        </div>
        <Link href="/dashboard/billing">
          <Button variant="secondary" className="gap-2">
            <Plus weight="bold" size={16} />
            Add Extra Credits
          </Button>
        </Link>
      </div>

      <MochiUsageCard usage={usage} plan={plan} />

      <Card className="p-6">
        <CardTitle>Mochi limits by plan</CardTitle>
        <p className="mt-1 text-sm text-fg-subtle">Every plan includes Mochi with these token budgets.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-fg-subtle">
                <th className="py-3 font-semibold text-fg">Plan</th>
                <th className="px-4 py-3 font-semibold text-fg">Per 5 hours</th>
                <th className="px-4 py-3 font-semibold text-fg">Per week</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PLAN_ORDER.map((p) => (
                <tr key={p} className={cn(p === plan && "bg-accent/5")}>
                  <td className="py-3 font-medium text-fg">
                    {PLANS[p].name}
                    {p === plan && <span className="ml-2 rounded-[var(--radius-pill)] bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">You</span>}
                  </td>
                  <td className="px-4 py-3 tnum text-fg-subtle">{fmt(MOCHI_LIMITS[p].per5h)}</td>
                  <td className="px-4 py-3 tnum text-fg-subtle">{fmt(MOCHI_LIMITS[p].perWeek)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
