import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getNavAccounts } from "@/lib/queries";
import { Sidebar, BottomNav } from "@/components/dashboard/nav";
import { Topbar } from "@/components/dashboard/topbar";
import { MochiChat } from "@/components/dashboard/mochi-chat";
import { IdleTimeout } from "@/components/auth/idle-timeout";
import Script from "next/script";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Force onboarding until the user has provisioned an account. A brand-new user
  // (or one whose Clerk row hasn't synced yet) is sent to the wizard, which
  // creates their paper account. A single account fetch drives both the
  // onboarding gate and the sidebar, instead of two separate user lookups on
  // every dashboard load. getNavAccounts is defensive: a missing user or a
  // transient DB error yields an empty list, which (as before) forces onboarding
  // rather than dropping the user into broken dashboard queries.
  const navAccounts = await getNavAccounts();
  if (navAccounts.length === 0) redirect("/onboarding");

  return (
    <div className="min-h-[100dvh] bg-base">
      <IdleTimeout />
      <div aria-hidden className="aurora pointer-events-none fixed inset-0 -z-10 opacity-70" />
      <Topbar />
      <Sidebar accounts={navAccounts} />
      <div className="pt-16 lg:pl-64">
        <main className="mx-auto max-w-[1400px] px-4 pb-32 pt-6 lg:px-8 lg:pb-32">
          <div className="mx-auto max-w-[1100px]">{children}</div>
        </main>
        <BottomNav />
        <MochiChat />
      </div>
      <Script src="https://floqex1.statuspage.io/embed/script.js" strategy="afterInteractive" />
    </div>
  );
}
