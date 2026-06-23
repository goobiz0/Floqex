"use server";

type FeedbackInput = {
  url: string;
  helpful: boolean;
  comments?: string;
};

export async function submitDocsFeedback(input: FeedbackInput) {
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
