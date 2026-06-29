import type { Metadata } from "next";
import { AccountsView } from "@/components/dashboard/accounts-view";
import { DashboardError } from "@/components/dashboard/states";
import { getAccountsOverview } from "@/lib/queries";

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
          <h3 className="text-lg font-bold text-fg mb-2">Service Unavailable</h3>
          <p className="text-sm text-fg-subtle max-w-md">
            We are currently unable to load your accounts. Please try refreshing the page in a few moments, or contact support if the issue persists.
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
          Connect broker accounts and manage the bot, balance, and guardrails for each.
        </p>
      </div>

      {data.error ? (
        <DashboardError
          title="Accounts unavailable"
          message="We could not load your accounts right now. Please refresh in a moment, and check the database connection if this persists."
        />
      ) : (
        <AccountsView data={data} />
      )}
    </div>
  );
}
