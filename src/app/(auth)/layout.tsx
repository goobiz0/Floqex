import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck, ChartLineUp, Eye } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/brand/wordmark";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { marketingUrl, dashboardUrl } from "@/lib/urls";
import { AnimatedOrbs } from "@/components/auth/animated-orbs";
import { NoiseOverlay } from "@/components/ui/noise-overlay";

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
        {/* Animated drifting glass blobs */}
        <AnimatedOrbs />
        
        {/* Subtle noise layered on top to add texture to the gradients */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none">
          <NoiseOverlay />
        </div>
        <div
          aria-hidden
          className="grid-faint pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_50%_at_30%_40%,black,transparent)]"
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

        <div className="relative max-w-sm z-10">
          <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-fg">
            Automated trading, radically clear.
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point.text} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-white shadow-sm text-accent ring-1 ring-black/5">
                  <point.icon size={20} />
                </span>
                <span className="text-sm font-medium text-fg-muted">{point.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-fg-subtle font-medium z-10">
          Trading involves risk of loss. Floqex is software, not financial advice.
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col bg-white/10 backdrop-blur-sm">
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
