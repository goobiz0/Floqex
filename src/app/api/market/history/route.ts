import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHistoryBars } from "@/lib/engine/market-data";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HistoryQuerySchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[a-zA-Z0-9._-]+$/),
  days: z.coerce.number().int().min(30).max(365).optional().default(180),
}).strict();

// Daily OHLC history powering the Strategy Lab backtest. Auth-gated (proxies an
// external data source). Returns real Yahoo Finance bars.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const success = await checkRateLimit(`market_history_${userId}`, 60, "1 m");
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url = new URL(req.url);
  const searchParamsObject = Object.fromEntries(url.searchParams.entries());
  const parsed = HistoryQuerySchema.safeParse(searchParamsObject);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { symbol, days } = parsed.data;
  const bars = await getHistoryBars(symbol, days);
  return NextResponse.json({ bars }, { headers: { "Cache-Control": "no-store" } });
}
