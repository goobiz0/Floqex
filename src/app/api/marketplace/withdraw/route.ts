import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { amountUsd, payoutEmail } = await req.json();

    if (!amountUsd || amountUsd <= 0) {
      return new NextResponse("Invalid amount", { status: 400 });
    }
    
    if (!payoutEmail) {
      return new NextResponse("Payout email is required", { status: 400 });
    }

    // Wrap in a transaction to ensure atomic balance deduction
    const withdrawalRequest = await prisma.$transaction(async (tx) => {
      // Re-fetch user to get the latest balance inside the transaction
      const currentUser = await tx.user.findUnique({
        where: { id: user.id }
      });

      if (!currentUser) throw new Error("User not found");

      const balance = Number(currentUser.sellerBalance);
      if (balance < amountUsd) {
        throw new Error("Insufficient balance");
      }

      // Deduct balance
      await tx.user.update({
        where: { id: user.id },
        data: {
          sellerBalance: { decrement: amountUsd }
        }
      });

      // Create withdrawal request
      return tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          amountUsd,
          payoutEmail,
          status: "PENDING",
        }
      });
    });

    return NextResponse.json(withdrawalRequest);
  } catch (error: any) {
    console.error("[MARKETPLACE_WITHDRAW]", error);
    if (error.message === "Insufficient balance") {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
