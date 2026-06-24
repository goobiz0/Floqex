import type { Metadata } from "next";
import { AccountsNewClient } from "./page-client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Connect Broker" };

export default async function NewAccountPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { plan: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Connect Broker</h1>
        <p className="text-sm text-fg-subtle">
          Link a brokerage account to deploy your bots.
        </p>
      </div>

      <AccountsNewClient plan={user?.plan ?? "FREE"} />
    </div>
  );
}
