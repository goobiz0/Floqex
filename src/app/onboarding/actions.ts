"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { connectAccount } from "@/app/dashboard/accounts/actions";

type Result = { ok: boolean; error?: string };

export type OnboardingInput = {
  nickname: string;
  timezone?: string;
  discordWebhookUrl?: string;
  referralSource?: string;
  experience?: string;
  goal?: string;
};

const DISCORD_WEBHOOK = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//;

/**
 * Finish onboarding: provision a real paper account (with its ORB strategy and
 * bot) if the user has none yet, and persist their survey answers + preferences
 * onto the Clerk user. Idempotent — a returning user keeps their existing
 * account. Resilient to Clerk webhook lag via getOrCreateUser, so the very
 * first run right after sign-up still works.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<Result> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "You are not signed in." };

  const user = await getOrCreateUser();
  if (!user) return { ok: false, error: "You are not signed in." };

  const discord = (input.discordWebhookUrl ?? "").trim();
  if (discord && !DISCORD_WEBHOOK.test(discord)) {
    return { ok: false, error: "That does not look like a Discord webhook URL." };
  }

  // Create the first paper account only if the user has none (idempotent).
  const accountCount = await prisma.account.count({ where: { userId: user.id } });
  if (accountCount === 0) {
    const res = await connectAccount({
      nickname: input.nickname.trim() || "Main account",
      broker: "PAPER",
      mode: "PAPER",
    });
    if (!res.ok) return res;
  }

  // Persist preferences + survey answers on the Clerk user (private — read
  // server-side by the engine for Discord alerts and to render session times).
  // onboardedAt also serves as the "has completed onboarding" marker.
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkId, {
      privateMetadata: {
        onboardedAt: new Date().toISOString(),
        timezone: input.timezone || "America/New_York",
        discordWebhookUrl: discord || null,
        referralSource: input.referralSource || null,
        experience: input.experience || null,
        goal: input.goal || null,
      },
    });

    // Notify the admin via Slack/Discord if configured
    if (process.env.ADMIN_DISCORD_WEBHOOK_URL) {
      await fetch(process.env.ADMIN_DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "🚀 New User Onboarded",
            color: 0x34d399, // Emerald
            fields: [
              { name: "Email", value: user.email, inline: true },
              { name: "Referral", value: input.referralSource || "N/A", inline: true },
              { name: "Experience", value: input.experience || "N/A", inline: true },
              { name: "Goal", value: input.goal || "N/A", inline: true },
            ],
            timestamp: new Date().toISOString()
          }]
        })
      });
    }

    // Push to Automation Webhook (Make.com/Zapier) if configured
    if (process.env.AUTOMATION_WEBHOOK_URL) {
      await fetch(process.env.AUTOMATION_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "onboarding_complete",
          email: user.email,
          referralSource: input.referralSource || "N/A",
          experience: input.experience || "N/A",
          goal: input.goal || "N/A",
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error("[Webhook] Failed to send onboarding data", err));
    }
  } catch (err) {
    // Non-fatal: the account exists; preferences can still be set in Settings.
    console.error("[completeOnboarding] could not save preferences", err);
  }

  return { ok: true };
}
