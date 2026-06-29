import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
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
      <div className="space-y-3">
        <Link
          href="/dashboard/accounts"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
        >
          <CaretLeft size={15} />
          Back to accounts
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Connect a broker</h1>
          <p className="text-sm text-fg-subtle">
            Link a brokerage account to deploy your bots. Start on paper to try the system risk free.
          </p>
        </div>
      </div>

      <AccountsNewClient plan={user?.plan ?? "FREE"} />
    </div>
  );
}
