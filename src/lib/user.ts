import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

/**
 * The database User for the current Clerk session, created on demand if the
 * Clerk webhook hasn't synced the row yet (e.g. immediately after sign-up).
 * Returns null when there is no signed-in session. Use this in write actions
 * that must not fail just because the webhook is a few seconds behind.
 */
export async function getOrCreateUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const cu = await currentUser();
  const email =
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    `${clerkId}@users.floqex.com`;

  // upsert (not create) to absorb a race with the webhook firing concurrently.
  return prisma.user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      email,
      firstName: cu?.firstName ?? null,
      lastName: cu?.lastName ?? null,
      imageUrl: cu?.imageUrl ?? null,
    },
    update: {},
  });
}

/**
 * Resolve and authorize an account for the current session. Returns the account
 * id only if it belongs to the signed-in user. When no accountId is supplied,
 * falls back to the user's first account. Returns null if unauthenticated or the
 * account is not owned by the user. Used to gate live streams and market lookups.
 */
export async function getOwnedAccountId(accountId?: string | null): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { accounts: { orderBy: { createdAt: "asc" }, select: { id: true } } },
  });
  const ids = user?.accounts.map((a) => a.id) ?? [];
  if (ids.length === 0) return null;
  if (accountId) return ids.includes(accountId) ? accountId : null;
  return ids[0];
}
