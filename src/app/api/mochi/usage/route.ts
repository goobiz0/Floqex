import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getMochiUsage } from "@/lib/mochi-usage";
import { type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Current Mochi token usage for the signed-in user, so the assistant UI and the
// usage/billing pages can show what has been spent against the plan limits.
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, plan: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = await getMochiUsage(user.id, user.plan as Plan);
  return NextResponse.json({ plan: user.plan, ...usage }, { headers: { "Cache-Control": "no-store" } });
}
