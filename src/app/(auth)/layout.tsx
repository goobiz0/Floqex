import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ChartLineUp, Eye } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/brand/wordmark";

const points = [
  { icon: ShieldCheck, text: "Hard risk limits the bot can never widen" },
  { icon: Eye, text: "Every decision narrated in plain English" },
  { icon: ChartLineUp, text: "Start on paper, go live when you are ready" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
      {/* Brand panel (static context) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-base p-10 lg:flex">
        <div
          aria-hidden
          className="glow-accent pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden
          className="grid-faint pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_50%_at_30%_40%,black,transparent)]"
        />
        <Link href="/" className="relative">
          <Wordmark />
        </Link>

        <div className="relative max-w-sm">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-fg">
            Automated trading, with nothing hidden.
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
                  <p.icon size={18} />
                </span>
                <span className="text-sm text-fg-muted">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-fg-faint">
          Trading involves risk of loss. Floqex is software, not financial advice.
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col bg-elevated/30">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>
        <Link
          href="/"
          className="absolute right-5 top-5 hidden items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg lg:inline-flex"
        >
          <ArrowLeft size={16} />
          Back to site
        </Link>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
