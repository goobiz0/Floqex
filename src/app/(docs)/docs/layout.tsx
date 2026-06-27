import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { 
  BookOpen, 
  RocketLaunch, 
  Flask, 
  ShieldCheck, 
  CreditCard, 
  BookBookmark,
  TerminalWindow,
  Layout,
  CurrencyCircleDollar,
  Cpu
} from "@phosphor-icons/react/dist/ssr";
import { FeedbackWidget } from "@/components/docs/feedback-widget";
import { DocsSearch } from "@/components/docs/docs-search";

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      { href: "/docs", label: "Getting Started", icon: RocketLaunch },
      { href: "/docs/dashboard", label: "Dashboard Guide", icon: Layout },
    ]
  },
  {
    title: "Core Concepts",
    items: [
      { href: "/docs/strategy", label: "The ORB Strategy", icon: Flask },
      { href: "/docs/risk", label: "Risk Management", icon: ShieldCheck },
      { href: "/docs/brokers", label: "Brokers & Connections", icon: CreditCard },
      { href: "/docs/billing", label: "Billing & Plans", icon: CurrencyCircleDollar },
    ]
  },
  {
    title: "Reference",
    items: [
      { href: "/docs/architecture", label: "Architecture", icon: Cpu },
      { href: "/api-docs", label: "API Documentation", icon: TerminalWindow },
      { href: "/docs/glossary", label: "Glossary", icon: BookBookmark },
    ]
  }
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-base text-fg selection:bg-accent/20">
      <div aria-hidden className="aurora pointer-events-none fixed inset-0 -z-10 opacity-40" />
      <div aria-hidden className="film-grain pointer-events-none fixed inset-0 -z-10 opacity-30" />
      
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-line bg-base/80 backdrop-blur-xl flex flex-col">
        <div className="flex flex-col gap-4 p-5 border-b border-line shrink-0">
          <Link href="/docs" aria-label="Floqex Docs Home" className="flex items-center gap-2 group">
            <Wordmark />
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-1.5 py-0.5 rounded transition-colors group-hover:bg-accent/20">Docs</span>
          </Link>
          <DocsSearch />
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-fg-faint px-3">
                {group.title}
              </h4>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-fg-muted transition-all hover:bg-surface hover:text-fg"
                    >
                      <item.icon size={18} weight="regular" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-4xl px-8 py-20 pb-32">
          {children}
          <div className="mt-24 border-t border-line pt-8">
            <FeedbackWidget />
          </div>
        </div>
      </main>
    </div>
  );
}
