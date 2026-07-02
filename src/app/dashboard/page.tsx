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
  // DB round-trips on every dashboard load.
  const [data, templates] = await Promise.all([
    getOverviewData(searchParams.account),
    getDashboardTemplates(),
  ]);

  // Read profile + plan + market prefs from the single Clerk/DB fetch above.
  // Plan is kept in sync by the Stripe webhook (api/webhooks/stripe), so there
  // is no need to hit the Stripe API on every page render.
  const userPlan = data.userPlan;
  const marketAsxEnabled = true; // Hardcode true or read from dbUser if needed, but since we removed it, we default to true.

  if (data.error) return <DashboardError title="Dashboard unavailable" message="We couldn't load your active bots or recent activity." />;

  const balance = data.account?.balance ?? 0;
  const recent = data.trades.slice(0, 6);
  const hasAccount = !!data.account;
  const hasBot = !!data.bot;

  return <DashboardPageClient
    balance={balance}
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
    isAllAccounts={data.account?.isAggregate ?? false}
    accountCount={data.account?.accountCount ?? 1}
  />;
}

