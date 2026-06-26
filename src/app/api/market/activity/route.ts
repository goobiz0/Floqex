import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getInstrumentActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The signed-in user's bot activity for one instrument: open holding, fills,
// realized P&L. Auth-scoped to the user's own accounts inside the query.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = new URL(req.url).searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const activity = await getInstrumentActivity(symbol);
  return NextResponse.json(activity, { headers: { "Cache-Control": "no-store" } });
}
