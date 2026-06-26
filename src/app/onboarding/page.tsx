import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { OnboardingClient } from "./onboarding-flow";

// Onboarding can only be completed once. If the user has already finished it
// (their Clerk profile carries `onboardedAt`, or they already have an account),
// send them straight to the dashboard instead of letting them run the wizard
// again and provision duplicate state.
export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let onboarded = false;
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    onboarded = Boolean((u.privateMetadata as Record<string, unknown>)?.onboardedAt);
  } catch {
    // Clerk read failed; fall back to the account check below.
  }

  if (!onboarded) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
      if (dbUser) {
        const accountCount = await prisma.account.count({ where: { userId: dbUser.id } });
        if (accountCount > 0) onboarded = true;
      }
    } catch {
      // Database unavailable; let the user proceed rather than hard-blocking.
    }
  }

  if (onboarded) redirect("/dashboard");

  return <OnboardingClient />;
}
