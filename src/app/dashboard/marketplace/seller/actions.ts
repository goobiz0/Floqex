"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkActionRateLimit } from "@/lib/ratelimit";

const RequestWithdrawalSchema = z.object({
  amountUsd: z.number().min(0.01).max(10000000),
  payoutEmail: z.string().email().max(200),
}).strict();

export async function requestWithdrawal(amountUsd: number, payoutEmail: string) {
  const parsed = RequestWithdrawalSchema.safeParse({ amountUsd, payoutEmail });
  if (!parsed.success) throw new Error(parsed.error.message);

  const rateLimitOk = await checkActionRateLimit("requestWithdrawal_seller", 5, "1 m");
  if (!rateLimitOk) throw new Error("Rate limit exceeded");

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
