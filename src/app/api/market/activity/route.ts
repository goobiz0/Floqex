import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getInstrumentActivity } from "@/lib/queries";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ActivityQuerySchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[a-zA-Z0-9._-]+$/),
}).strict();

// The signed-in user's bot activity for one instrument: open holding, fills,
// realized P&L. Auth-scoped to the user's own accounts inside the query.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const success = await checkRateLimit(`market_activity_${userId}`, 60, "1 m");
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url = new URL(req.url);
  const searchParamsObject = Object.fromEntries(url.searchParams.entries());
  const parsed = ActivityQuerySchema.safeParse(searchParamsObject);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { symbol } = parsed.data;

  const activity = await getInstrumentActivity(symbol);
  return NextResponse.json(activity, { headers: { "Cache-Control": "no-store" } });
}
