import Link from "next/link";
import { CaretRight, Gear, Star } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getRecentNotifications } from "@/lib/queries";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Countdown } from "@/components/dashboard/countdown";
import { EmergencyStop } from "@/components/dashboard/emergency-stop";
import { TopbarUser } from "@/components/dashboard/topbar-user";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { HelpMenu } from "@/components/dashboard/help-menu";
import { dashboardUrl } from "@/lib/urls";
import { PLAN_ORDER, type Plan } from "@/lib/plans";

const STATUS: Record<string, { tone: "positive" | "warning" | "neutral"; label: string; pulse: boolean }> = {
  RUNNING: { tone: "positive", label: "Running", pulse: true },
  WAITING: { tone: "warning", label: "Waiting", pulse: false },
  STOPPED: { tone: "neutral", label: "Stopped", pulse: false },
};

const TOP_PLAN = PLAN_ORDER[PLAN_ORDER.length - 1];

export async function Topbar() {
  const [data, notifications] = await Promise.all([topbarData(), getRecentNotifications()]);
  const account = data?.account ?? null;
  const status = STATUS[account?.botStatus ?? "STOPPED"] ?? STATUS.STOPPED;
  const canUpgrade = (data?.plan ?? "FREE") !== TOP_PLAN;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-base/80 px-4 backdrop-blur lg:px-6">
      {/* Left: current account + command palette search */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          href={dashboardUrl("/accounts")}
          className="group inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface py-1.5 pl-3 pr-2 text-sm transition-colors hover:border-line-strong"
        >
          <span className="max-w-[10rem] truncate font-medium text-fg">
            {account?.nickname ?? "No account"}
          </span>
          {account ? (
            <Badge tone={account.mode === "LIVE" ? "warning" : "neutral"} className="hidden sm:inline-flex">
              {account.mode === "LIVE" ? "Live" : "Paper"}
            </Badge>
          ) : null}
          <CaretRight size={13} weight="bold" className="text-fg-faint group-hover:text-fg-subtle" />
        </Link>
        <CommandPalette />
      </div>

      {/* Right: live ops, then account chrome */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="hidden items-center gap-1.5 text-xs text-fg-muted md:inline-flex">
          <StatusDot tone={status.tone} pulse={status.pulse} />
          {status.label}
        </span>
        <Countdown />
        <EmergencyStop />

        <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" />

        <NotificationsBell items={notifications} />
        <span className="hidden sm:block">
          <HelpMenu />
        </span>
        <Link
          href={dashboardUrl("/settings")}
          aria-label="Settings"
          className="hidden h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg sm:inline-flex"
        >
          <Gear size={18} />
        </Link>

        {canUpgrade ? (
          <Link
            href={dashboardUrl("/billing")}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-elevated py-1.5 pl-2.5 pr-3 text-xs font-medium text-fg shadow-[var(--shadow-sm)] transition-colors hover:border-line-strong"
          >
            <Star size={14} weight="fill" className="text-accent" />
            <span className="hidden sm:inline">Upgrade</span>
          </Link>
        ) : null}

        <TopbarUser />
      </div>
    </header>
  );
}

/** The signed-in user's plan + primary account + bot status. Defensive: never crashes the shell. */
async function topbarData(): Promise<{
  plan: Plan;
  account: { nickname: string; mode: string; botStatus: string } | null;
} | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        plan: true,
        accounts: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { nickname: true, mode: true, bot: { select: { status: true } } },
        },
      },
    });
    if (!user) return null;
    const a = user.accounts[0];
    return {
      plan: user.plan as Plan,
      account: a
        ? { nickname: a.nickname, mode: a.mode, botStatus: a.bot?.status ?? "STOPPED" }
        : null,
    };
  } catch {
    return null;
  }
}
