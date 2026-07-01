import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getQuoteSnapshot } from "@/lib/engine/market-data";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QuoteQuerySchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[a-zA-Z0-9._-]+$/),
}).strict();

// Live quote lookup for the stock-search experience. Auth-gated to signed-in
// users (it proxies an external data source). Returns real Yahoo Finance data.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const success = await checkRateLimit(`market_quote_${userId}`, 60, "1 m");
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url = new URL(req.url);
  const searchParamsObject = Object.fromEntries(url.searchParams.entries());
  const parsed = QuoteQuerySchema.safeParse(searchParamsObject);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { symbol } = parsed.data;

  const quote = await getQuoteSnapshot(symbol);
  if (!quote) return NextResponse.json({ error: "No data for that symbol" }, { status: 404 });

  return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
}
