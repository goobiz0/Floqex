"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { connectAccount } from "@/app/dashboard/accounts/actions";
import type { Broker, AccountMode } from "@prisma/client";
import { z } from "zod";
import { checkActionRateLimit } from "@/lib/ratelimit";

const OnboardingInputSchema = z.object({
  nickname: z.string().min(1).max(50),
  timezone: z.string().max(100).optional(),
  referralSource: z.string().max(200).optional(),
  experience: z.string().max(200).optional(),
  goal: z.string().max(200).optional(),
  asset: z.string().max(100).optional(),
  apiKey: z.string().max(200).optional(),
  apiSecret: z.string().max(200).optional(),
  broker: z.string().max(100).optional(),
  affiliateCode: z.string().max(100).optional(),
}).strict();

type Result = { ok: boolean; error?: string };

export type OnboardingInput = {
  nickname: string;
  timezone?: string;
  referralSource?: string;
  experience?: string;
  goal?: string;
  asset?: string;
  apiKey?: string;
  apiSecret?: string;
  broker?: string;
  affiliateCode?: string;
};

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
  const parsed = OnboardingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const rateLimitOk = await checkActionRateLimit("completeOnboarding", 5, "1 m");
  if (!rateLimitOk) return { ok: false, error: "Rate limit exceeded" };

  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "You are not signed in." };

  try {
    const user = await getOrCreateUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    // Hard guard: onboarding runs exactly once. If the user has already been
    // onboarded (and provisioned an account), short-circuit so a repeat call
    // cannot create a second account or re-fire the notifications below.
    const accountCount = await prisma.account.count({ where: { userId: user.id } });
    let alreadyOnboarded = false;
    try {
      const existing = await clerkClient();
      const cu = await existing.users.getUser(clerkId);
      alreadyOnboarded = Boolean((cu.privateMetadata as Record<string, unknown>)?.onboardedAt);
    } catch {
      // Ignore — the account-count check still guards against duplicates.
    }
    if (alreadyOnboarded && accountCount > 0) {
      return { ok: true };
    }

    // Create the first account only if the user has none (idempotent).
    if (accountCount === 0) {
      const mode = input.apiKey && input.apiSecret ? "LIVE" : "PAPER";
      // Currently defaulting to ALPACA for live accounts if keys are provided
      const broker = mode === "LIVE" ? (input.broker || "ALPACA") : "PAPER";

      const res = await connectAccount({
        nickname: input.nickname.trim() || "Main account",
        broker: broker as unknown as Broker,
        mode: mode as unknown as AccountMode,
        apiKey: input.apiKey,
        apiSecret: input.apiSecret,
      });
      if (!res.ok) return res;
      
      // Process manual affiliate code entry
      if (input.affiliateCode) {
        try {
          const referrer = await prisma.user.findUnique({
            where: { affiliateCode: input.affiliateCode },
          });

          // Prevent self-referral or double-award
          if (referrer && referrer.id !== user.id && !user.referredById) {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: user.id },
                data: { referredById: referrer.id },
              }),
              prisma.user.update({
                where: { id: referrer.id },
                data: { affiliateBalanceUsd: { increment: 2 } },
              }),
            ]);
          }
        } catch (err) {
          console.error("Failed to process affiliate code during onboarding", err);
        }
      }
    }

    // Persist preferences + survey answers on the Clerk user
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkId, {
        privateMetadata: {
          onboardedAt: new Date().toISOString(),
          timezone: input.timezone || "America/New_York",
          referralSource: input.referralSource || null,
          experience: input.experience || null,
          goal: input.goal || null,
          asset: input.asset || null,
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
              "Asset": { select: { name: input.asset || "N/A" } }
            }
          });
        } catch (notionErr) {
          console.error("[Webhook] Failed to send onboarding data to Notion", notionErr);
        }
      }

    } catch (err: unknown) {
      console.error("[completeOnboarding] could not save preferences", err);
    }

    return { ok: true };
  } catch (err: unknown) {
    console.error("[completeOnboarding] Failed to complete onboarding:", err);
    return { ok: false, error: `A database connection error occurred: ${err instanceof Error ? err.message : String(err)}` };
  }
}
