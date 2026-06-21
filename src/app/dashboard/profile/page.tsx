import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { ArrowRight, Bank, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS, type Plan } from "@/lib/plans";
import { dashboardUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await currentUser();
  const dbUser = user
    ? await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { plan: true, createdAt: true },
      })
    : null;

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Your account";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initial = (name[0] ?? "F").toUpperCase();
  const plan = PLANS[(dbUser?.plan as Plan) ?? "FREE"];
  const memberSince = dbUser?.createdAt
    ? dbUser.createdAt.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Profile</h1>
        <p className="text-sm text-fg-subtle">Your identity and account standing.</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-semibold text-accent">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-fg">{name}</p>
            {email && <p className="truncate text-sm text-fg-subtle">{email}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="accent">{plan.name} plan</Badge>
              {memberSince && (
                <span className="text-xs text-fg-subtle">Member since {memberSince}</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
          <Button href={dashboardUrl("/settings")} variant="secondary" size="sm">
            <ShieldCheck size={16} />
            Name and security
          </Button>
          <Button href={dashboardUrl("/billing")} variant="ghost" size="sm">
            Manage plan
            <ArrowRight size={16} weight="bold" />
          </Button>
        </div>
      </Card>

      {/* Funding is a later phase; shown disabled rather than faked. */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Funding</CardTitle>
          <Badge tone="neutral">Coming soon</Badge>
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
          Deposits and withdrawals arrive with funded accounts. Until then, paper accounts run on
          simulated balances and live accounts are funded through your own broker.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled>
            <Bank size={16} />
            Deposit
          </Button>
          <Button variant="secondary" size="sm" disabled>
            Withdraw
          </Button>
        </div>
      </Card>
    </div>
  );
}
