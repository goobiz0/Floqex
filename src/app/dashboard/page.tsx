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

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const data = await getOverviewData(searchParams.account);
  const { userId } = await auth();
  const client = await clerkClient();

  let userNickname = "User";
  let userAvatarUrl = "https://github.com/shadcn.png"; // Default

  if (userId) {
    try {
      const clerkUser = await client.users.getUser(userId);
      userNickname = clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || "User";
      userAvatarUrl = clerkUser.imageUrl || userAvatarUrl;
    } catch {}
  }

  if (data.error) return <DashboardError title="Dashboard unavailable" message="We couldn't load your active bots or recent activity." />;

  // Default metrics/balance fallback
  const balance = data.account?.balance ?? 4560;
  const recent = data.trades.slice(0, 6);

  return <DashboardPageClient balance={balance} nickname={userNickname} avatarUrl={userAvatarUrl} recent={recent} />;
}
