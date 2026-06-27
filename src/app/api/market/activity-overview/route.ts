import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBotActivityOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Every instrument the signed-in user's bots have traded, ranked by activity,
// with a per-account split. Powers the markets landing view and side panel.
// Auth-scoped to the user's own accounts inside the query.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const overview = await getBotActivityOverview();
  return NextResponse.json(overview, { headers: { "Cache-Control": "no-store" } });
}
