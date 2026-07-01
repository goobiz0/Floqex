"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { checkActionRateLimit } from "@/lib/ratelimit";

export async function generateMcpKey() {
  const rateLimitOk = await checkActionRateLimit("generateMcpKey_profile", 5, "1 m");
  if (!rateLimitOk) return { ok: false, error: "Rate limit exceeded" };

  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  // Generate a key like fqx_mcp_{userId}_abc123...
  const key = `fqx_mcp_${userId}_` + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { mcpKey: key }
  });

  revalidatePath("/dashboard/profile");
  return { ok: true };
}
