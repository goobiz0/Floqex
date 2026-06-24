import { prisma } from "@/lib/db";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function sendUrgentAlert(
  userId: string,
  eventType: "TRADE" | "RISK" | "ERROR",
  title: string, 
  message: string, 
  context: Record<string, any> = {}
) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const clerkUser = await clerkClient.users.getUser(user.clerkId);
    const m = (clerkUser.privateMetadata ?? {}) as Record<string, unknown>;

    // Send to Discord Webhook
    if (m.notifyDiscord && m.discordWebhookUrl && typeof m.discordWebhookUrl === 'string') {
      if (eventType === "TRADE" && !m.notifyEveryTrade) {
        // Skip trade alerts if disabled
      } else {
        await fetchWebhook(m.discordWebhookUrl, title, message, context, eventType);
      }
    }

    // Send to Custom Webhook
    if (m.notifyCustomWebhook && m.customWebhookUrl && typeof m.customWebhookUrl === 'string') {
      const alertRisk = m.notifyCustomRisk !== false;
      const alertError = m.notifyCustomError !== false;
      const alertTrade = m.notifyCustomTrade === true;

      if (eventType === "RISK" && !alertRisk) return;
      if (eventType === "ERROR" && !alertError) return;
      if (eventType === "TRADE" && !alertTrade) return;

      await fetchWebhook(m.customWebhookUrl, title, message, context, eventType);
    }

  } catch (error) {
    console.error("Failed to send urgent alert to webhook:", error);
  }
}

async function fetchWebhook(url: string, title: string, message: string, context: Record<string, any>, eventType: string) {
  const payload = {
    embeds: [
      {
        title: `🚨 ${title}`,
        description: message,
        color: eventType === "ERROR" ? 16711680 : eventType === "RISK" ? 16753920 : 65280,
        fields: Object.entries(context).map(([key, value]) => ({
          name: key,
          value: String(value),
          inline: true
        })),
        timestamp: new Date().toISOString()
      }
    ]
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
