/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import type { Metadata } from "next";
import { Plus, MagnifyingGlass, DotsThree, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { getOverviewData } from "@/lib/queries";
import { formatUSD } from "@/lib/utils";
import { DashboardError } from "@/components/dashboard/states";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { DashboardPageClient } from "./page-client";
import { getDashboardTemplates } from "./template-actions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const data = await getOverviewData(searchParams.account);
  const { userId } = await auth();
  const client = await clerkClient();

  let userNickname = "User";
  let userAvatarUrl = "https://github.com/shadcn.png"; // Default

  let userPlan = "FREE";
  if (userId) {
    try {
      const clerkUser = await client.users.getUser(userId);
      userNickname = clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || "User";
      userAvatarUrl = clerkUser.imageUrl || userAvatarUrl;

      const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (dbUser) {
        userPlan = dbUser.plan;

        // Active checking to ensure plan sync
        if (dbUser.stripeSubscriptionId) {
          try {
            const { getStripe } = await import("@/lib/stripe");
            const sub = await getStripe().subscriptions.retrieve(dbUser.stripeSubscriptionId);
            const { isPaidPriceId, planFromPriceId } = await import("@/lib/plans");

            const priceId = sub.items.data.map((i) => i.price?.id).find((id) => isPaidPriceId(id)) ?? sub.items.data[0]?.price?.id;
            const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const syncedPlan = active ? ((sub.metadata?.plan as any) || planFromPriceId(priceId)) : "FREE";

            if (dbUser.plan !== syncedPlan) {
               await prisma.user.update({ where: { id: dbUser.id }, data: { plan: syncedPlan } });
               userPlan = syncedPlan;
            }
          } catch (e) {
             console.error("Failed to sync stripe plan on load:", e);
          }
        }
      }

    } catch {}
  }


  let marketAsxEnabled = true;
  if (userId) {
    try {
      const clerkUser = await client.users.getUser(userId);
      const m = (clerkUser.privateMetadata ?? {}) as Record<string, unknown>;
      marketAsxEnabled = m.marketAsxEnabled !== false;
    } catch {}
  }

  const templates = await getDashboardTemplates();

  if (data.error) return <DashboardError title="Dashboard unavailable" message="We couldn't load your active bots or recent activity." />;

  const balance = data.account?.balance ?? 0;
  const recent = data.trades.slice(0, 6);
  const hasAccount = !!data.account;
  const hasBot = !!data.bot;

  return <DashboardPageClient 
    balance={balance} 
    nickname={userNickname} 
    avatarUrl={userAvatarUrl} 
    recent={recent} 
    hasAccount={hasAccount}
    hasBot={hasBot}
    summaries={data.summaries}
    trades={data.trades}
    agentEvents={data.agentEvents}
    botStatus={data.bot?.status ?? "NONE"}
    lastHeartbeat={data.bot?.lastHeartbeat ?? null}
    accountId={data.account?.id ?? null}
    initialTemplates={templates}
    userPlan={userPlan}
    marketAsxEnabled={marketAsxEnabled}
  />;
}

