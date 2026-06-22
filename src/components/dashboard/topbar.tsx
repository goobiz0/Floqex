import Link from "next/link";
import { Gear, Star } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getRecentNotifications } from "@/lib/queries";
import { Wordmark } from "@/components/brand/wordmark";
import { TopbarUser } from "@/components/dashboard/topbar-user";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { HelpMenu } from "@/components/dashboard/help-menu";
import { dashboardUrl } from "@/lib/urls";
import { PLAN_ORDER, type Plan } from "@/lib/plans";

const TOP_PLAN = PLAN_ORDER[PLAN_ORDER.length - 1];

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/journal", label: "News" },
  { href: "/help", label: "Support" },
  { href: "/dashboard/settings", label: "More" },
];

/** Full-width top bar: brand at the left, centered links, right cluster. */
export async function Topbar() {
  const [plan, notifications] = await Promise.all([userPlan(), getRecentNotifications()]);
  const canUpgrade = plan !== TOP_PLAN;

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 bg-base">
      <div className="flex h-full items-center justify-between px-4 lg:px-8">
        {/* Left: Brand + Search */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            aria-label="Floqex home"
            className="flex shrink-0 items-center"
          >
            <Wordmark />
          </Link>
          <div className="hidden sm:block">
            <CommandPalette />
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationsBell items={notifications} />
          <span className="hidden sm:block">
            <HelpMenu />
          </span>
          <Link
            href={dashboardUrl("/settings")}
            aria-label="Settings"
            className="hidden h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] text-fg-subtle transition-colors hover:bg-surface hover:text-fg sm:inline-flex"
          >
            <Gear size={18} />
          </Link>
          {canUpgrade ? (
            <Link
              href={dashboardUrl("/billing")}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-fg py-1.5 pl-2.5 pr-3 text-xs font-medium text-[var(--color-on-accent)] transition-opacity hover:opacity-90"
            >
              <Star size={14} weight="fill" className="text-accent" />
              Upgrade
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
