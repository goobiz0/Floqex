import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { BookOpen, RocketLaunch, Flask, ShieldCheck, CreditCard, Strategy, BookBookmark } from "@phosphor-icons/react/dist/ssr";
import { FeedbackWidget } from "@/components/docs/feedback-widget";

const NAV_ITEMS = [
  { href: "/docs", label: "Getting Started", icon: RocketLaunch },
  { href: "/docs/strategy", label: "ORB Strategy", icon: Flask },
  { href: "/docs/risk", label: "Risk Management", icon: ShieldCheck },
  { href: "/docs/brokers", label: "Brokers & Connections", icon: CreditCard },
  { href: "/docs/glossary", label: "Glossary", icon: BookBookmark },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-base">
      <div aria-hidden className="aurora pointer-events-none fixed inset-0 -z-10 opacity-70" />
      
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-line bg-surface/50 backdrop-blur-xl">
        <div className="flex h-16 items-center px-6 border-b border-line">
          <Link href="/docs" aria-label="Floqex Docs Home" className="flex items-center gap-2">
            <Wordmark />
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded">Docs</span>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-line/50 hover:text-fg"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-3xl px-8 py-16 pb-24">
          {children}
          <FeedbackWidget />
        </div>
      </main>
    </div>
  );
}
