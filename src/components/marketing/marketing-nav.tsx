import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { authUrl } from "@/lib/urls";
import { MarketingMobileMenu } from "./marketing-mobile-menu";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-base/80 backdrop-blur-md">
      <nav className="mx-auto grid h-16 max-w-[1200px] grid-cols-[1fr_auto] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr] md:px-6 lg:px-8">
        <Link href="/" aria-label="Floqex home" className="justify-self-start">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-1 md:flex md:justify-self-center">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-[var(--radius-control)] px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          <Button href={authUrl("/sign-in")} variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button href={authUrl("/sign-up")} size="sm">
            Get started
          </Button>
          <MarketingMobileMenu links={links} />
        </div>
      </nav>
    </header>
  );
}
