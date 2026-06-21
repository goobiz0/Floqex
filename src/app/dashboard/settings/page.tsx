import type { Metadata } from "next";
import { SettingsView } from "@/components/dashboard/settings-view";
import { getTradeData } from "@/lib/queries";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { trades } = await getTradeData();
  const { userId } = await auth();
  const user = userId ? await prisma.user.findUnique({ where: { clerkId: userId } }) : null;
  const accountRows = user
    ? await prisma.account.findMany({
        where: { userId: user.id },
        select: { id: true, nickname: true, broker: true, maxDailyDrawdown: true },
      })
    : [];
  // Serialize Prisma Decimal to a plain number at the Server/Client boundary.
  const accounts = accountRows.map((a) => ({
    id: a.id,
    nickname: a.nickname,
    broker: a.broker,
    maxDailyDrawdown: a.maxDailyDrawdown ? Number(a.maxDailyDrawdown) : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Settings</h1>
        <p className="text-sm text-fg-subtle">
          Notifications, alert thresholds, and data export.
        </p>
      </div>
      <SettingsView trades={trades} accounts={accounts} />
    </div>
  );
}
