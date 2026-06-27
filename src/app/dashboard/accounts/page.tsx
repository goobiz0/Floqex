import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/card";
import { AccountsView } from "@/components/dashboard/accounts-view";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  let accountRows: Prisma.AccountGetPayload<{ include: { bot: { select: { status: true } } } }>[] = [];
  let dbError = false;
  let user = null;

  try {
    const { userId } = await auth();
    user = userId ? await prisma.user.findUnique({ where: { clerkId: userId } }) : null;
    accountRows = user
      ? await prisma.account.findMany({
          where: { userId: user.id },
          include: { bot: { select: { status: true } } },
          orderBy: { createdAt: "asc" },
        })
      : [];
  } catch (error) {
    console.error("Database connection error in AccountsPage:", error);
    dbError = true;
  }

  // Serialize at the Server/Client boundary: Decimal -> number, drop Date fields.
  const accounts = accountRows.map((a) => ({
    id: a.id,
    nickname: a.nickname,
    broker: a.broker,
    mode: a.mode,
    balance: Number(a.balance),
    isPropFirmMode: a.isPropFirmMode,
    propFirmMaxTrailingDrawdown: a.propFirmMaxTrailingDrawdown ? Number(a.propFirmMaxTrailingDrawdown) : null,
    bot: a.bot ? { status: a.bot.status } : null,
  }));

  if (dbError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Accounts</h1>
          <p className="text-sm text-fg-subtle">
            Connect broker accounts. Each one runs its own isolated bot.
          </p>
        </div>
        <Card className="p-8 text-center flex flex-col items-center justify-center border-dashed border-line">
          <h3 className="text-lg font-bold text-fg mb-2">Database Connection Error</h3>
          <p className="text-sm text-fg-subtle max-w-md">
            We are unable to connect to the database. Please check your Supabase connection strings in the Vercel dashboard and ensure your project is active.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Accounts</h1>
        <p className="text-sm text-fg-subtle">
          Connect broker accounts. Each one runs its own isolated bot.
        </p>
      </div>

      <AccountsView initialAccounts={accounts} plan={user?.plan ?? "FREE"} />

      <Card className="p-5">
        <CardTitle>Profile</CardTitle>
        <div className="mt-4 flex flex-col items-start gap-2">
          <p className="text-sm font-medium text-fg">Your personal details</p>
          <p className="text-xs text-fg-subtle mb-2">
            Manage your name, email, and security preferences from the settings page.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface px-3 text-xs font-medium text-fg hover:bg-surface/80 hover:text-fg"
          >
            Manage profile
          </a>
        </div>
      </Card>
    </div>
  );
}
