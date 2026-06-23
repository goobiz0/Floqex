"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function generateMcpKey() {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  // Generate a key like fqx_mcp_abc123...
  const key = "fqx_mcp_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  await prisma.user.update({
    where: { clerkId: userId },
    data: { mcpKey: key },
  });

  revalidatePath("/dashboard/profile");
  return { ok: true };
}
