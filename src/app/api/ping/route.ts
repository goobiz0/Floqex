

import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "edge";

// Minimal, uncached endpoint used by the dashboard latency widget to measure a
// real client to Floqex round trip. Intentionally tiny so the timing reflects
// network + edge latency rather than payload size.
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const success = await checkRateLimit(`ping_${ip}`, 300, "1 m");
  if (!success) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return new Response(JSON.stringify({ t: Date.now() }), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
