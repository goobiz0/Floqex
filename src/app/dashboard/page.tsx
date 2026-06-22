import type { Metadata } from "next";
import { getOverviewData } from "@/lib/queries";
import { DashboardError } from "@/components/dashboard/states";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { DashboardPageClient } from "./page-client";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getOverviewData();
  const { userId } = await auth();

  let userNickname = "User";
  let userAvatarUrl = "https://github.com/shadcn.png"; // Default

  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      if (user) {
        userNickname = user.email.split('@')[0];
        if (user.imageUrl) userAvatarUrl = user.imageUrl;
      }
    } catch {}
  }

  if (data.error) return <DashboardError title="Dashboard unavailable" message="We couldn't load your active bots or recent activity." />;

  // Default metrics/balance fallback
  const balance = data.account?.balance ?? 4560;
  const recent = data.trades.slice(0, 6);

  return <DashboardPageClient balance={balance} nickname={userNickname} avatarUrl={userAvatarUrl} recent={recent} />;
}
