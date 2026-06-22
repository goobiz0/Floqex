import Link from "next/link";
import { Gear, Star } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getRecentNotifications } from "@/lib/queries";
import { Wordmark } from "@/components/brand/wordmark";
import { EmergencyStop } from "@/components/dashboard/emergency-stop";
import { TopbarUser } from "@/components/dashboard/topbar-user";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { HelpMenu } from "@/components/dashboard/help-menu";
import { dashboardUrl } from "@/lib/urls";
import { PLAN_ORDER, type Plan } from "@/lib/plans";

const TOP_PLAN = PLAN_ORDER[PLAN_ORDER.length - 1];

/** Full-width top bar: brand at the left (aligned to the sidebar), a centered
 *  command-palette search, and the account cluster at the right. */
export async function Topbar() {
  const [plan, notifications] = await Promise.all([userPlan(), getRecentNotifications()]);
  const canUpgrade = plan !== TOP_PLAN;

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-line bg-elevated">
      <div className="flex h-full items-center gap-3 pr-4 lg:pr-6">
        {/* Brand, aligned to the sidebar column on lg */}
        <Link
          href="/dashboard"
          aria-label="Floqex home"
          className="flex h-full shrink-0 items-center px-4 lg:w-60 lg:px-5"
        >
          <Wordmark />
        </Link>

        {/* Centered command-palette search */}
        <div className="flex flex-1 justify-center">
          <CommandPalette />
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-fg py-1.5 pl-2.5 pr-3 text-xs font-medium text-[var(--color-on-accent)] transition-opacity hover:opacity-90"
            >
              <Star size={14} weight="fill" className="text-accent" />
              <span className="hidden sm:inline">Upgrade</span>
            </Link>
          ) : null}
          <TopbarUser />
        </div>
      </div>
    </header>
  );
}

/** The signed-in user's plan, for the Upgrade pill. Defensive: never crashes the shell. */
async function userPlan(): Promise<Plan> {
  try {
    const { userId } = await auth();
    if (!userId) return "FREE";
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { plan: true },
    });
    return (user?.plan as Plan) ?? "FREE";
  } catch {
    return "FREE";
  }
}
