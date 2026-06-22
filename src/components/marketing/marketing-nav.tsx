import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { authUrl, dashboardUrl } from "@/lib/urls";
import { MarketingMobileMenu } from "./marketing-mobile-menu";
import { AuthButtons } from "./auth-buttons";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
];

export async function MarketingNav() {
  return (
    <header className="fixed left-1/2 top-6 z-50 w-[90%] max-w-4xl -translate-x-1/2">
      <nav className="flex h-14 items-center justify-between gap-4 rounded-[var(--radius-pill)] border border-line/50 bg-white/60 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl md:px-6">
        <Link href="/" aria-label="Floqex home" className="flex shrink-0 items-center">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-fg-subtle transition-colors hover:bg-black/5 hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <AuthButtons />
          <div className="md:hidden">
            <MarketingMobileMenu links={links} />
          </div>
        </div>
      </nav>
    </header>
  );
}
