import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getNavAccounts } from "@/lib/queries";
import { Sidebar, BottomNav } from "@/components/dashboard/nav";
import { Topbar } from "@/components/dashboard/topbar";
import { DashboardFooter } from "@/components/dashboard/dashboard-footer";
import { MochiChat } from "@/components/dashboard/mochi-chat";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Force onboarding until the user has provisioned an account. A brand-new user
  // (or one whose Clerk row hasn't synced yet) is sent to the wizard, which
  // creates their paper account. Computed defensively so a transient DB error
  // never traps the user — the redirect runs outside the try/catch because
  // redirect() signals via a thrown error.
  let needsOnboarding = false;
  const { userId } = await auth();
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { _count: { select: { accounts: true } } },
      });
      needsOnboarding = !user || user._count.accounts === 0;
    } catch {
      needsOnboarding = false;
    }
  }
  if (needsOnboarding) redirect("/onboarding");

  const navAccounts = await getNavAccounts();

  return (
    <div className="min-h-[100dvh] bg-base">
      <Topbar />
      <Sidebar accounts={navAccounts} />
      <div className="pt-14 lg:pl-60">
        <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 lg:px-6 lg:pb-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
        <DashboardFooter />
        <BottomNav />
        <MochiChat />
      </div>
    </div>
  );
}
