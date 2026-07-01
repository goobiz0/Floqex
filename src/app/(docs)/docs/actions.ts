"use server";

import { z } from "zod";
import { checkActionRateLimit } from "@/lib/ratelimit";

type FeedbackInput = {
  url: string;
  helpful: boolean;
  comments?: string;
};

const FeedbackInputSchema = z.object({
  url: z.string().max(2000),
  helpful: z.boolean(),
  comments: z.string().max(2000).optional(),
}).strict();

export async function submitDocsFeedback(input: FeedbackInput) {
  const parsed = FeedbackInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const rateLimitOk = await checkActionRateLimit("submitDocsFeedback", 10, "1 m");
  if (!rateLimitOk) return { ok: false, error: "Rate limit exceeded" };

  if (!process.env.AUTOMATION_WEBHOOK_URL) {
    console.log("[Feedback] Webhook not configured, dropping feedback:", input);
    return { ok: true }; // Silent success for local dev
  }

  try {
    const res = await fetch(process.env.AUTOMATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "docs_feedback",
        url: input.url,
        helpful: input.helpful,
        comments: input.comments || "No comment",
        timestamp: new Date().toISOString()
      })
    });

    if (!res.ok) {
      console.error("[Webhook] Feedback error:", await res.text());
      return { ok: false, error: "Failed to save feedback" };
    }

    return { ok: true };
  } catch (err) {
    console.error("[Webhook] Feedback exception:", err);
    return { ok: false, error: "Server error" };
  }
}
