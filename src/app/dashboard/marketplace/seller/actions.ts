"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function requestWithdrawal(amountUsd: number, payoutEmail: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  if (Number(user.sellerBalance) < amountUsd) {
    throw new Error("Insufficient balance");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { sellerBalance: { decrement: amountUsd } }
    });

    await tx.withdrawalRequest.create({
      data: {
        userId: user.id,
        amountUsd,
        payoutEmail,
        status: "PENDING"
      }
    });
  });

  revalidatePath("/dashboard/marketplace/seller");
}
