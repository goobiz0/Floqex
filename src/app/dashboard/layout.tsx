import { type ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";
import { getNavAccounts } from "@/lib/queries";
import { Sidebar, BottomNav } from "@/components/dashboard/nav";
import { Topbar } from "@/components/dashboard/topbar";
import { MochiChat } from "@/components/dashboard/mochi-chat-loader";
import { IdleTimeout } from "@/components/auth/idle-timeout";
import Script from "next/script";

async function SidebarWrapper() {
  const navAccounts = await getNavAccounts();
  if (navAccounts.length === 0) redirect("/onboarding");
  return <Sidebar accounts={navAccounts} />;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {

  return (
    <div className="min-h-[100dvh] bg-base">
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              const width = localStorage.getItem('sidebar-width');
              if (width) {
                document.documentElement.style.setProperty('--sidebar-width', width + 'px');
              }
            } catch (e) {}

            try {
              if (document.cookie.includes('floqex_ref=')) {
                fetch('/api/affiliate/register', { method: 'POST' }).catch(() => {});
              }
            } catch (e) {}
          `
        }}
      />
      <IdleTimeout />
      <div aria-hidden className="aurora pointer-events-none fixed inset-0 -z-10 opacity-70" />
      <Topbar />
      <Suspense fallback={null}>
        <SidebarWrapper />
      </Suspense>
      <div className="pt-16 pl-sidebar">
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
