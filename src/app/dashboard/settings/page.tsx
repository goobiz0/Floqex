import type { Metadata } from "next";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { SettingsView } from "@/components/dashboard/settings-view";
import { getTradeData } from "@/lib/queries";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

const DEFAULT_SETTINGS = {
  discordWebhookUrl: "",
  notifyDiscord: true,
  notifyEmail: true,
  notifyPush: false,
  notifySms: false,
  smsNumber: "",
  notifyCustomWebhook: false,
  customWebhookUrl: "",
  notifyCustomTrade: false,
  notifyCustomRisk: true,
  notifyCustomError: true,
  notifyEveryTrade: false,
  dailyLossAlertPct: 2.5,
  drawdownAlertPct: 8,
  globalKillSwitch: false,
  maxGlobalDrawdown: 10,
};

export default async function SettingsPage() {
  const { trades } = await getTradeData();
  const { userId } = await auth();

  let user = null;
  let accountRows: any[] = [];
  
  if (userId) {
    try {
      user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (user) {
        accountRows = await prisma.account.findMany({
          where: { userId: user.id },
          select: { id: true, nickname: true, broker: true, maxDailyDrawdown: true },
        });
      }
    } catch (e) {
      console.error("Prisma error in Settings:", e);
    }
  }

  // Serialize Prisma Decimal to a plain number at the Server/Client boundary.
  const accounts = accountRows.map((a) => ({
    id: a.id,
    nickname: a.nickname,
    broker: a.broker,
    maxDailyDrawdown: a.maxDailyDrawdown ? Number(a.maxDailyDrawdown) : null,
  }));

  // Notification prefs live on the Clerk user's privateMetadata (same store as
  // onboarding; read by the engine for Discord alerts).
  let settings = DEFAULT_SETTINGS;
  let mcpKey = "";
  if (userId) {
    try {
      const client = await clerkClient();
      const cu = await client.users.getUser(userId);
      const m = (cu.privateMetadata ?? {}) as Record<string, unknown>;
      mcpKey = typeof m.mcpKey === "string" ? m.mcpKey : "";
      settings = {
        discordWebhookUrl: typeof m.discordWebhookUrl === "string" ? m.discordWebhookUrl : "",
        notifyDiscord: m.notifyDiscord !== false,
        notifyEmail: m.notifyEmail !== false,
        notifyPush: m.notifyPush === true,
        notifySms: m.notifySms === true,
        smsNumber: typeof m.smsNumber === "string" ? m.smsNumber : "",
        notifyCustomWebhook: m.notifyCustomWebhook === true,
        customWebhookUrl: typeof m.customWebhookUrl === "string" ? m.customWebhookUrl : "",
        notifyCustomTrade: m.notifyCustomTrade === true,
        notifyCustomRisk: m.notifyCustomRisk !== false,
        notifyCustomError: m.notifyCustomError !== false,
        notifyEveryTrade: m.notifyEveryTrade === true,
        dailyLossAlertPct: typeof m.dailyLossAlertPct === "number" ? m.dailyLossAlertPct : 2.5,
        drawdownAlertPct: typeof m.drawdownAlertPct === "number" ? m.drawdownAlertPct : 8,
        globalKillSwitch: m.globalKillSwitch === true,
        maxGlobalDrawdown: typeof m.maxGlobalDrawdown === "number" ? m.maxGlobalDrawdown : 10,
      };
    } catch {
      settings = DEFAULT_SETTINGS;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Settings</h1>
        <p className="text-sm text-fg-subtle">
          Notifications, alert thresholds, and data export.
        </p>
      </div>
      <SettingsView trades={trades} accounts={accounts} settings={settings} mcpKey={mcpKey} />
    </div>
  );
}
