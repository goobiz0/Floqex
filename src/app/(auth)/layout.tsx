import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck, ChartLineUp, Eye } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/brand/wordmark";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { marketingUrl, dashboardUrl } from "@/lib/urls";
import { AnimatedOrbs } from "@/components/auth/animated-orbs";

const points = [
  { icon: ShieldCheck, text: "Hard risk limits the bot can never widen" },
  { icon: Eye, text: "Every decision narrated in plain English" },
  { icon: ChartLineUp, text: "Start on paper, go live when you are ready" },
];

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (userId) {
    redirect(dashboardUrl());
  }

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2 relative overflow-hidden bg-base">
      {/* Brand panel (Left) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden lg:flex bg-surface/50 text-fg p-12 border-r border-line/50">
        {/* Soft, single-accent emerald glows drifting behind the content */}
        <AnimatedOrbs />

        {/* One faint structural grid, masked so it fades out toward the edges */}
        <div
          aria-hidden
          className="grid-faint pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(60%_50%_at_30%_40%,black,transparent)]"
        />

        <div className="flex flex-col gap-8 relative z-10">
          <a
            href={marketingUrl()}
            className="flex w-fit items-center gap-1.5 text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
          >
            <ArrowLeft size={16} />
            Back to site
          </a>
          <a href={marketingUrl()} className="relative w-fit">
            <Wordmark />
          </a>
        </div>

        <div className="relative max-w-[420px] z-10">
          <h2 className="text-balance text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
            Automated trading, <br/>
            <span className="text-fg-muted">radically clear.</span>
          </h2>
          <div className="mt-12 flex flex-col gap-3">
            {points.map((point) => (
              <div
                key={point.text}
                className="group relative flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface/80 p-4 transition-colors hover:border-line-strong hover:bg-surface"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent ring-1 ring-inset ring-accent/20">
                  <point.icon size={20} weight="duotone" />
                </div>
                <span className="text-[15px] font-medium text-fg/90">{point.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-fg-subtle font-medium z-10">
          Trading involves risk of loss. Floqex is software, not financial advice.
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col bg-base">
        <div className="flex items-center justify-between p-5 lg:hidden relative z-10">
          <a href={marketingUrl()}>
            <Wordmark />
          </a>
          <a
            href={marketingUrl()}
            className="flex items-center gap-1.5 text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
          >
            <ArrowLeft size={16} />
            Back
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
