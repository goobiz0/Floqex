import { NextResponse } from "next/server";
// import { Ratelimit } from "@upstash/ratelimit";
// import { Redis } from "@upstash/redis";

// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL || "",
//   token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
// });
// 
// const ratelimit = new Ratelimit({
//   redis: redis,
//   limiter: Ratelimit.slidingWindow(10, "10 s"),
// });

export async function POST(req: Request) {
  try {
    // const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    // const { success } = await ratelimit.limit(ip);
    // if (!success) {
    //   return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    // }

    const payload = await req.json();
    
    const { event, message, discordWebhookUrl, telegramBotToken, telegramChatId } = payload;
    
    // Discord Integration
    if (discordWebhookUrl) {
      await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `**Floqex PRO Bot Alert**: ${event}\n${message}` })
      }).catch(e => console.error("Discord webhook failed", e));
    }
    
    // Telegram Integration
    if (telegramBotToken && telegramChatId) {
      const tgUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramChatId, text: `Floqex PRO Bot Alert: ${event}\n${message}` })
      }).catch(e => console.error("Telegram webhook failed", e));
    }

    return NextResponse.json({ success: true, delivered: true });
  } catch (err: any) {
    console.error("Bot webhook dispatch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
