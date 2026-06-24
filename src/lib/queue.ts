import { Client } from "@upstash/qstash";

// Upstash QStash client for background jobs
// Useful for heavy computations, backtesting, or delayed webhooks
export const queue = new Client({
  token: process.env.QSTASH_TOKEN || "placeholder_token",
});

export async function publishBackgroundJob(destinationUrl: string, payload: any, delaySeconds: number = 0) {
  if (!process.env.QSTASH_TOKEN) {
    console.warn("QSTASH_TOKEN not set, background job simulated for:", destinationUrl);
    return null;
  }
  
  return await queue.publishJSON({
    url: destinationUrl,
    body: payload,
    delay: delaySeconds,
  });
}
