import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHistoryBars } from "@/lib/engine/market-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Daily OHLC history powering the Strategy Lab backtest. Auth-gated (proxies an
// external data source). Returns real Yahoo Finance bars.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const days = Math.min(365, Math.max(30, Number(url.searchParams.get("days")) || 180));
  const bars = await getHistoryBars(symbol, days);
  return NextResponse.json({ bars }, { headers: { "Cache-Control": "no-store" } });
}
