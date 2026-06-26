import Link from "next/link";
import { Gear, Star, Question } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getRecentNotifications } from "@/lib/queries";
import { Wordmark } from "@/components/brand/wordmark";
import { TopbarUser } from "@/components/dashboard/topbar-user";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { EStopWidget } from "@/components/dashboard/e-stop-widget";
import { dashboardUrl } from "@/lib/urls";
import { PLAN_ORDER, type Plan } from "@/lib/plans";

const TOP_PLAN = PLAN_ORDER[PLAN_ORDER.length - 1];

/** Full-width top bar: brand at the left, centered links, right cluster. */
export async function Topbar() {
  const [plan, notifications, user] = await Promise.all([
    userPlan(),
    getRecentNotifications(),
    getTopBarUserMeta(),
  ]);
  const canUpgrade = plan !== TOP_PLAN;

  const { clerkClient } = await import("@clerk/nextjs/server");
  const clerkId = (await auth()).userId;
  let marketAsxEnabled = false;
  if (clerkId) {
    try {
      const client = await clerkClient();
      const cu = await client.users.getUser(clerkId);
      marketAsxEnabled = (cu.privateMetadata?.marketAsxEnabled !== false);
    } catch {}
  }

  // Market logic: NY Session is 9:30 AM to 4:00 PM EST, Mon-Fri.
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const estHour = estTime.getHours();
  const estMinute = estTime.getMinutes();
  const estDay = estTime.getDay();
  const isNyseOpen = estDay >= 1 && estDay <= 5 && (estHour > 9 || (estHour === 9 && estMinute >= 30)) && estHour < 16;

  // ASX logic: Sydney session is 10:00 AM to 4:00 PM AEDT, Mon-Fri.
  const aydtTime = new Date(now.toLocaleString("en-US", { timeZone: "Australia/Sydney" }));
  const aydtHour = aydtTime.getHours();
  const aydtDay = aydtTime.getDay();
  const isAsxOpen = marketAsxEnabled && aydtDay >= 1 && aydtDay <= 5 && aydtHour >= 10 && aydtHour < 16;

  const isMarketOpen = isNyseOpen || isAsxOpen;

  // Uptime logic: find the earliest running bot for the user
  let uptimeString = "00h 00m";
  if (user?.accounts) {
    const runningBots = user.accounts
      .map(a => a.bot)
      .filter(b => b && b.status === "RUNNING");
    
    if (runningBots.length > 0) {
      // Find oldest updated/created bot that's running
      const oldestBot = runningBots.reduce((oldest, bot) => {
        if (!bot) return oldest;
        if (!oldest) return bot;
        const ts = bot.updatedAt ? bot.updatedAt.getTime() : 0;
        const oldestTs = oldest.updatedAt ? oldest.updatedAt.getTime() : 0;
        return ts < oldestTs ? bot : oldest;
      }, runningBots[0]);

      if (oldestBot && oldestBot.updatedAt) {
        let startTime = oldestBot.updatedAt.getTime();

        // If market is open now, we want to calculate uptime from when market opened OR when bot was started
        if (isMarketOpen) {
          const nyseOpenTime = new Date();
          nyseOpenTime.setHours(9, 30, 0, 0); // local time approximation, actually we should use the estTime logic

          let marketOpenTimeMs = startTime;

          if (isNyseOpen) {
             const nyseOpen = new Date(estTime);
             nyseOpen.setHours(9, 30, 0, 0);
             const tzOffset = estTime.getTime() - now.getTime();
             const localNyseOpenMs = nyseOpen.getTime() - tzOffset;
             marketOpenTimeMs = Math.max(startTime, localNyseOpenMs);
          } else if (isAsxOpen) {
             const asxOpen = new Date(aydtTime);
             asxOpen.setHours(10, 0, 0, 0);
             const tzOffset = aydtTime.getTime() - now.getTime();
             const localAsxOpenMs = asxOpen.getTime() - tzOffset;
             marketOpenTimeMs = Math.max(startTime, localAsxOpenMs);
          }

          const diffMs = now.getTime() - marketOpenTimeMs;
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));
          uptimeString = diffMs >= 0 ? `${diffHrs.toString().padStart(2, "0")}h ${diffMins.toString().padStart(2, "0")}m` : "00h 00m";
        } else {
          uptimeString = "00h 00m";
        }
      }
    } else {
      uptimeString = "OFFLINE";
    }
  }

  const hasRunningBots = user?.accounts?.some(a => a.bot?.status === "RUNNING") ?? false;

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 bg-base/80 backdrop-blur-md border-b border-line/50">
      <div className="flex h-full items-center justify-between px-4 lg:px-8">
        {/* Left: Brand + Search */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            aria-label="Floqex home"
            className="flex shrink-0 items-center transition-opacity hover:opacity-80"
          >
            <Wordmark />
          </Link>
          <div className="hidden sm:block">
            <CommandPalette />
          </div>
        </div>

        {/* Center: Sleek Stats Pill */}
        <div className="hidden md:flex items-center gap-3 bg-surface/50 border border-line/50 rounded-full px-2 py-1 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 px-2">
            {isMarketOpen ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-positive shadow-[0_0_8px_rgba(var(--positive-rgb),0.8)]"></span>
                </span>
                <span className="text-[10px] font-semibold text-fg tracking-widest uppercase">{isNyseOpen && isAsxOpen ? "NYSE & ASX OPEN" : isNyseOpen ? "NYSE OPEN" : "ASX OPEN"}</span>
              </>
            ) : (
              <>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fg-muted"></span>
                <span className="text-[10px] font-semibold text-fg-subtle tracking-widest uppercase">MARKETS CLOSED</span>
              </>
            )}
          </div>
          <div className="w-px h-3 bg-line" />
          <div className="flex items-center gap-2 px-2">
            <span className="text-[10px] font-mono font-medium text-fg-subtle uppercase">Uptime</span>
            <span className="text-[11px] font-mono font-semibold text-fg">{uptimeString}</span>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <EStopWidget hasRunningBots={hasRunningBots} />

          <NotificationsBell items={notifications} />
          
          <Link
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Documentation"
            className="hidden h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg sm:inline-flex"
          >
            <Question size={18} />
          </Link>

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
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent py-1.5 pl-2.5 pr-3 text-xs font-semibold tracking-wide text-[var(--color-on-accent)] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(var(--accent-rgb),0.35)]"
            >
              <Star size={14} weight="fill" className="text-[var(--color-on-accent)]" />
              Upgrade
            </Link>
          ) : null}
          <div className="pl-1">
            <TopbarUser />
          </div>
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

async function getTopBarUserMeta() {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    return await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: {
          include: { bot: true }
        }
      }
    });
  } catch {
    return null;
  }
}
