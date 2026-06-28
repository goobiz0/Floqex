import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

// This route dispatches bot alerts to user-configured Discord / Telegram
// destinations. Because it fetches a user-supplied URL server-side, the host is
// allow-listed to the official Discord/Telegram domains to prevent the endpoint
// being used as an SSRF relay against internal services.
const DISCORD_WEBHOOK_HOSTS = new Set([
  "discord.com",
  "discordapp.com",
  "ptb.discord.com",
  "canary.discord.com",
]);

function isAllowedDiscordWebhook(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      DISCORD_WEBHOOK_HOSTS.has(url.hostname) &&
      url.pathname.startsWith("/api/webhooks/")
    );
  } catch {
    return false;
  }
}

// Telegram bot tokens are "<digits>:<alphanumeric>"; reject anything else so we
// never interpolate arbitrary input into the api.telegram.org URL.
const TELEGRAM_TOKEN_RE = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;

const MAX_FIELD = 2000;
function clampString(v: unknown): string {
  return typeof v === "string" ? v.slice(0, MAX_FIELD) : "";
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const allowed = await checkRateLimit(`bot_webhook_${ip}`, 10, "10 s");
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const event = clampString(payload.event);
    const message = clampString(payload.message);
    const discordWebhookUrl =
      typeof payload.discordWebhookUrl === "string" ? payload.discordWebhookUrl : "";
    const telegramBotToken =
      typeof payload.telegramBotToken === "string" ? payload.telegramBotToken : "";
    const telegramChatId = clampString(payload.telegramChatId);

    let delivered = false;

    // Discord Integration
    if (discordWebhookUrl) {
      if (!isAllowedDiscordWebhook(discordWebhookUrl)) {
        return NextResponse.json(
          { error: "discordWebhookUrl must be an official Discord webhook URL" },
          { status: 400 }
        );
      }
      await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**Floqex PRO Bot Alert**: ${event}\n${message}`,
        }),
      })
        .then(() => {
          delivered = true;
        })
        .catch((e) => console.error("Discord webhook failed", e));
    }

    // Telegram Integration
    if (telegramBotToken && telegramChatId) {
      if (!TELEGRAM_TOKEN_RE.test(telegramBotToken)) {
        return NextResponse.json(
          { error: "Invalid telegramBotToken format" },
          { status: 400 }
        );
      }
      const tgUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: `Floqex PRO Bot Alert: ${event}\n${message}`,
        }),
      })
        .then(() => {
          delivered = true;
        })
        .catch((e) => console.error("Telegram webhook failed", e));
    }

    return NextResponse.json({ success: true, delivered });
  } catch (err: unknown) {
    console.error("Bot webhook dispatch error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
