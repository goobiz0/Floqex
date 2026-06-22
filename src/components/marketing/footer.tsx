import Link from "next/link";
import { XLogo, DiscordLogo, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Wordmark } from "@/components/brand/wordmark";
import { authUrl } from "@/lib/urls";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/security", label: "Security" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: authUrl("/sign-in"), label: "Sign in" },
      { href: authUrl("/sign-up"), label: "Get started" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/risk-disclosure", label: "Risk disclosure" },
    ],
  },
];

const socials: { href: string; label: string; icon: Icon }[] = [
  { href: "https://x.com/floqex", label: "Floqex on X", icon: XLogo },
  { href: "https://discord.gg/floqex", label: "Floqex on Discord", icon: DiscordLogo },
  { href: "https://github.com/floqex", label: "Floqex on GitHub", icon: GithubLogo },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-subtle">
              Automated trading with hard risk limits and a decision log you can
              actually read.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.href}
                    href={s.href}
                    aria-label={s.label}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-line text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <Icon size={17} />
                  </a>
                );
              })}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-fg-faint">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-fg-muted transition-colors hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-fg-faint sm:flex-row sm:items-center sm:justify-between">
          <p>2026 Floqex. All rights reserved.</p>
          <p className="max-w-md leading-relaxed">
            Trading involves risk of loss. Past performance does not guarantee
            future results. Floqex is software, not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
