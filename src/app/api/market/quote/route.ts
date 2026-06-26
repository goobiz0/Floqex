import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getQuoteSnapshot } from "@/lib/engine/market-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Live quote lookup for the stock-search experience. Auth-gated to signed-in
// users (it proxies an external data source). Returns real Yahoo Finance data.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = new URL(req.url).searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const quote = await getQuoteSnapshot(symbol);
  if (!quote) return NextResponse.json({ error: "No data for that symbol" }, { status: 404 });

  return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
}
