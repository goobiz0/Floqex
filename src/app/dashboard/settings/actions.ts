"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

type Result = { ok: boolean; error?: string };

export type NotificationPrefs = {
  discordWebhookUrl: string;
  notifyDiscord: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyEveryTrade: boolean;
  dailyLossAlertPct: number;
  drawdownAlertPct: number;
};

const DISCORD_WEBHOOK = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//;

/**
 * Persist notification preferences onto the Clerk user's privateMetadata — the
 * same store onboarding writes to and the engine reads for Discord alerts.
 */
export async function updateNotificationPreferences(prefs: NotificationPrefs): Promise<Result> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "You are not signed in." };

  const webhook = (prefs.discordWebhookUrl ?? "").trim();
  if (webhook && !DISCORD_WEBHOOK.test(webhook)) {
    return { ok: false, error: "That does not look like a Discord webhook URL." };
  }
  const clampPct = (n: number, lo: number, hi: number) =>
    Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;

  try {
    const client = await clerkClient();
    const current = await client.users.getUser(userId);
    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...current.privateMetadata,
        discordWebhookUrl: webhook || null,
        notifyDiscord: prefs.notifyDiscord,
        notifyEmail: prefs.notifyEmail,
        notifyPush: prefs.notifyPush,
        notifyEveryTrade: prefs.notifyEveryTrade,
        dailyLossAlertPct: clampPct(prefs.dailyLossAlertPct, 0, 100),
        drawdownAlertPct: clampPct(prefs.drawdownAlertPct, 0, 100),
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save preferences. Please try again." };
  }
}

/**
 * Reset every paper account back to its starting state: clear trades, summaries
 * and agent events, restore the $10,000 balance, and stop the bot. Live accounts
 * are never touched.
 */
export async function resetPaperAccount(): Promise<Result> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "You are not signed in." };
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { accounts: { where: { mode: "PAPER" }, include: { bot: true } } },
    });
    if (!user || user.accounts.length === 0) {
      return { ok: false, error: "No paper account to reset." };
    }
    for (const account of user.accounts) {
      await prisma.$transaction([
        prisma.agentEvent.deleteMany({ where: { accountId: account.id } }),
        prisma.trade.deleteMany({ where: { accountId: account.id } }),
        prisma.dailySummary.deleteMany({ where: { accountId: account.id } }),
        prisma.account.update({ where: { id: account.id }, data: { balance: 10000 } }),
        ...(account.bot
          ? [
              prisma.bot.update({
                where: { id: account.bot.id },
                data: { status: "STOPPED", autoAdjustmentsUsed: 0 },
              }),
            ]
          : []),
      ]);
    }
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reset the account. Please try again." };
  }
}

/**
 * Permanently delete the signed-in user: their database records (accounts, bots,
 * trades, etc. cascade) and their Clerk identity. The caller signs out after.
 */
export async function deleteUserAccount(): Promise<Result> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "You are not signed in." };
  try {
    // Cascades to accounts, bots, strategies, trades, summaries, agent events.
    await prisma.user.deleteMany({ where: { clerkId: userId } });
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the account. Please contact support." };
  }
}
