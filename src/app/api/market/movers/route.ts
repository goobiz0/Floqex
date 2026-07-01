import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMarketMovers } from "@/lib/engine/market-data";
import { ASSET_CATALOG } from "@/lib/assets";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MoversQuerySchema = z.object({
  asx: z.enum(["true", "false"]).optional(),
}).strict();

// A liquid, recognisable universe for the Top Movers widget: US single names +
// majors and the core crypto set. ASX names are appended only when the caller
// opts in (mirrors the user's market preference), keeping the upstream fan-out
// small and the ranking meaningful.
const US_UNIVERSE = ASSET_CATALOG.filter((a) => a.market === "US" && a.kind === "STOCK").map((a) => a.symbol);
const CRYPTO_UNIVERSE = ASSET_CATALOG.filter((a) => a.market === "CRYPTO").map((a) => a.symbol);
const ASX_UNIVERSE = ASSET_CATALOG.filter((a) => a.market === "ASX" && a.kind === "STOCK").map((a) => a.symbol);

// Real Yahoo-backed top gainers/losers across the curated universe. Auth-gated
// because it proxies an external data source. No fabricated numbers.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const success = await checkRateLimit(`market_movers_${userId}`, 60, "1 m");
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url = new URL(req.url);
  const searchParamsObject = Object.fromEntries(url.searchParams.entries());
  const parsed = MoversQuerySchema.safeParse(searchParamsObject);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const includeAsx = parsed.data.asx !== "false";
  const universe = [...US_UNIVERSE, ...CRYPTO_UNIVERSE, ...(includeAsx ? ASX_UNIVERSE : [])];

  try {
    const movers = await getMarketMovers(universe);
    return NextResponse.json(movers, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load market movers" }, { status: 502 });
  }
}
