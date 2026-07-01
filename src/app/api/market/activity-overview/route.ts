import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBotActivityOverview } from "@/lib/queries";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Aggregate bot activity overview for all of the signed-in user's accounts,
// powering the global portfolio activity table. scoped inside the query.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const success = await checkRateLimit(`market_activity_overview_${userId}`, 60, "1 m");
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const overview = await getBotActivityOverview();
  return NextResponse.json(overview, { headers: { "Cache-Control": "no-store" } });
}
