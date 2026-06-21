import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Countdown } from "@/components/dashboard/countdown";
import { EmergencyStop } from "@/components/dashboard/emergency-stop";
import { dashboardUrl } from "@/lib/urls";

const STATUS: Record<string, { tone: "positive" | "warning" | "neutral"; label: string; pulse: boolean }> = {
  RUNNING: { tone: "positive", label: "Running", pulse: true },
  WAITING: { tone: "warning", label: "Waiting", pulse: false },
  STOPPED: { tone: "neutral", label: "Stopped", pulse: false },
};

export async function Topbar() {
  const account = await currentAccount();
  const status = STATUS[account?.botStatus ?? "STOPPED"] ?? STATUS.STOPPED;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-base/80 px-4 backdrop-blur lg:px-6">
      {/* Current account — links to the accounts page (honest, no dead dropdown) */}
      <Link
        href={dashboardUrl("/accounts")}
        className="group inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface py-1.5 pl-3 pr-2 text-sm transition-colors hover:border-line-strong"
      >
        <span className="font-medium text-fg">{account?.nickname ?? "No account"}</span>
        {account && (
          <Badge tone={account.mode === "LIVE" ? "warning" : "neutral"} className="hidden sm:inline-flex">
            {account.mode === "LIVE" ? "Live" : "Paper"}
          </Badge>
        )}
        <CaretRight size={13} weight="bold" className="text-fg-faint group-hover:text-fg-subtle" />
      </Link>

      {/* Status cluster */}
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <StatusDot tone={status.tone} pulse={status.pulse} />
          <span className="hidden sm:inline">{status.label}</span>
        </span>
        <Countdown />
        <EmergencyStop />
      </div>
    </header>
  );
}

/** The signed-in user's primary account + bot status. Defensive: never crashes the shell. */
async function currentAccount() {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        accounts: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { nickname: true, mode: true, bot: { select: { status: true } } },
        },
      },
    });
    const a = user?.accounts[0];
    return a ? { nickname: a.nickname, mode: a.mode, botStatus: a.bot?.status ?? "STOPPED" } : null;
  } catch {
    return null;
  }
}
