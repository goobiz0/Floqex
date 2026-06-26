import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchSymbols } from "@/lib/engine/market-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Symbol autocomplete for the market search box. Auth-gated (proxies an external
// data source) and returns up to 8 matches across every market.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const results = await searchSymbols(q);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
