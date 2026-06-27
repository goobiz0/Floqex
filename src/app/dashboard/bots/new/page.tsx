import type { Metadata } from "next";
import { BotsNewClient } from "./page-client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Create Bot" };

export default async function NewBotPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, plan: true },
  });

  if (!user) redirect("/sign-in");

  // Fetch accounts that DO NOT have a bot attached yet
  const availableAccounts = await prisma.account.findMany({
    where: { 
      userId: user.id,
      bot: null 
    },
    select: {
      id: true,
      nickname: true,
      broker: true,
      mode: true,
      balance: true,
    },
    orderBy: { createdAt: "asc" }
  });

  // Fetch the user's existing strategies
  const strategiesRaw = await prisma.strategy.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      kind: true,
      version: true,
      params: true,
    }
  });

  // Surface the latest Edge Score (persisted in params by the Validation Lab) so
  // the deploy step can warn before a fragile strategy is wired to live capital.
  const strategies = strategiesRaw.map((s) => {
    const p = (s.params as Record<string, unknown>) ?? {};
    return {
      id: s.id,
      name: s.name,
      kind: s.kind,
      version: s.version,
      edgeScore: typeof p.edgeScore === "number" ? p.edgeScore : null,
      edgeVerdict: typeof p.edgeVerdict === "string" ? p.edgeVerdict : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Create Bot</h1>
        <p className="text-sm text-fg-subtle">
          Configure a trading strategy and attach it to an empty broker account.
        </p>
      </div>

      <BotsNewClient
        plan={user.plan}
        availableStrategies={strategies}
        availableAccounts={availableAccounts.map(a => ({
        ...a,
        balance: Number(a.balance)
      }))} />
    </div>
  );
}
