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
  const { userId } = await auth();

  // Fire the independent reads concurrently instead of serially. Each of these
  // used to await in sequence, stacking a Clerk round-trip on top of several
  // DB round-trips on every dashboard load.
  const [data, templates, clerkUser, dbUser] = await Promise.all([
    getOverviewData(searchParams.account),
    getDashboardTemplates(),
    userId
      ? clerkClient()
          .then((client) => client.users.getUser(userId))
          .catch(() => null)
      : Promise.resolve(null),
    userId
      ? prisma.user.findUnique({ where: { clerkId: userId } }).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Read profile + plan + market prefs from the single Clerk/DB fetch above.
  // Plan is kept in sync by the Stripe webhook (api/webhooks/stripe), so there
  // is no need to hit the Stripe API on every page render.
  const userNickname =
    clerkUser?.firstName || clerkUser?.emailAddresses[0]?.emailAddress.split("@")[0] || "User";
  const userAvatarUrl = clerkUser?.imageUrl || "https://github.com/shadcn.png";
  const userPlan = dbUser?.plan ?? "FREE";
  const marketAsxEnabled =
    ((clerkUser?.privateMetadata ?? {}) as Record<string, unknown>).marketAsxEnabled !== false;

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
    openTrades={data.openTrades}
    agentEvents={data.agentEvents}
    botStatus={data.bot?.status ?? "NONE"}
    lastHeartbeat={data.bot?.lastHeartbeat ?? null}
    accountId={data.account?.id ?? null}
    initialTemplates={templates}
    userPlan={userPlan}
    marketAsxEnabled={marketAsxEnabled}
  />;
}

