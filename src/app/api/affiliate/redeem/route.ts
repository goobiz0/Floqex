import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const balance = Number(user.affiliateBalanceUsd);
    if (balance <= 0) {
      return NextResponse.json({ error: "No balance to redeem" }, { status: 400 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: "Must have a Stripe customer ID to redeem (start a subscription or buy credits first)" }, { status: 400 });
    }

    // Amount to credit (in cents). Negative amount means we owe them (customer balance credit)
    const amountCents = Math.round(balance * 100);

    // Ensure it's atomic
    await prisma.$transaction(async (tx) => {
      // 1. Reset balance locally
      await tx.user.update({
        where: { id: user.id },
        data: { affiliateBalanceUsd: 0 },
      });

      // 2. Create customer balance transaction in Stripe
      await getStripe().customers.createBalanceTransaction(user.stripeCustomerId!, {
        amount: -amountCents, // Credit to their account (Stripe uses negative for credit)
        currency: "usd",
        description: "Affiliate program redemption",
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Affiliate redeem error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
