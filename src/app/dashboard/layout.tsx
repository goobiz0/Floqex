import type { ReactNode } from "react";
import { Sidebar, BottomNav } from "@/components/dashboard/nav";
import { Topbar } from "@/components/dashboard/topbar";
import { MochiChat } from "@/components/dashboard/mochi-chat";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-base">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 lg:px-6 lg:pb-10">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
        <BottomNav />
        <MochiChat />
      </div>
    </div>
  );
}
