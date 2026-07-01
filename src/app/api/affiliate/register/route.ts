import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Get the floqex_ref cookie
  // Note: we can read cookies directly from headers or req.cookies (if we use NextRequest)
  // Let's parse it from headers manually just in case, or use next/headers
  // Actually, wait, let's use the standard next/headers cookies()
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const refCode = cookieStore.get("floqex_ref")?.value;

  if (!refCode) {
    return NextResponse.json({ ok: false, reason: "No referral cookie found" });
  }

  try {
    // 2. Fetch the current user and the referrer
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // If the user was already referred by someone, don't double-award
    if (user.referredById) {
      const response = NextResponse.json({ ok: true, reason: "Already referred" });
      response.cookies.delete("floqex_ref");
      return response;
    }

    // Find the referrer
    const referrer = await prisma.user.findUnique({
      where: { affiliateCode: refCode },
    });

    if (!referrer) {
      const response = NextResponse.json({ ok: false, reason: "Invalid referral code" });
      response.cookies.delete("floqex_ref");
      return response;
    }

    // Prevent self-referral
    if (referrer.id === user.id) {
      const response = NextResponse.json({ ok: false, reason: "Self-referral is not allowed" });
      response.cookies.delete("floqex_ref");
      return response;
    }

    // 3. Link the user and award the referrer ($2) using a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { referredById: referrer.id },
      }),
      prisma.user.update({
        where: { id: referrer.id },
        data: { affiliateBalanceUsd: { increment: 2 } },
      }),
    ]);

    const response = NextResponse.json({ ok: true });
    // Clean up the cookie
    response.cookies.delete("floqex_ref");
    return response;
  } catch (error: any) {
    console.error("Affiliate register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
