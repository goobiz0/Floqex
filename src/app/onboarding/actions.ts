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
import { Client } from "@notionhq/client";

// ... existing code in completeOnboarding
export async function completeOnboarding(input: OnboardingInput): Promise<Result> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "You are not signed in." };

  try {
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

    // Persist preferences + survey answers on the Clerk user
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

      if (process.env.ADMIN_DISCORD_WEBHOOK_URL) {
        await fetch(process.env.ADMIN_DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: "🚀 New User Onboarded",
              color: 0x34d399,
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

      // Add to Notion database if configured
      if (process.env.NOTION_API_KEY && process.env.NOTION_ONBOARDING_DB_ID) {
        try {
          const notion = new Client({ auth: process.env.NOTION_API_KEY });
          await notion.pages.create({
            parent: { database_id: process.env.NOTION_ONBOARDING_DB_ID },
            properties: {
              "Name": { title: [{ text: { content: input.nickname || "User" } }] },
              "Email": { email: user.email },
              "Timezone": { rich_text: [{ text: { content: input.timezone || "N/A" } }] },
              "Referral": { select: { name: input.referralSource || "N/A" } },
              "Experience": { select: { name: input.experience || "N/A" } },
              "Goal": { select: { name: input.goal || "N/A" } },
              "Discord": { url: input.discordWebhookUrl || null }
            }
          });
        } catch (notionErr) {
          console.error("[Webhook] Failed to send onboarding data to Notion", notionErr);
        }
      }

    } catch (err) {
      console.error("[completeOnboarding] could not save preferences", err);
    }

    return { ok: true };
  } catch (err) {
    console.error("[completeOnboarding] Failed to complete onboarding:", err);
    return { ok: false, error: "A database connection error occurred. Please try again." };
  }
}
