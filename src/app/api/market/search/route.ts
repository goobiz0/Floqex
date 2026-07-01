import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchSymbols } from "@/lib/engine/market-data";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SearchQuerySchema = z.object({
  q: z.string().max(50).optional(),
}).strict();

// Symbol autocomplete for the market search box. Auth-gated (proxies an external
// data source) and returns up to 8 matches across every market.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const success = await checkRateLimit(`market_search_${userId}`, 60, "1 m");
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url = new URL(req.url);
  const searchParamsObject = Object.fromEntries(url.searchParams.entries());
  const parsed = SearchQuerySchema.safeParse(searchParamsObject);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const q = parsed.data.q?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const results = await searchSymbols(q);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
