"use client";

import { XLogo, DiscordLogo, GithubLogo, ArrowUp, type Icon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";

const socials: { href: string; label: string; icon: Icon }[] = [
  { href: "https://x.com/floqex", label: "Floqex on X", icon: XLogo },
  { href: "https://discord.gg/floqex", label: "Floqex on Discord", icon: DiscordLogo },
  { href: "https://github.com/floqex", label: "Floqex on GitHub", icon: GithubLogo },
];

/** Slim dashboard footer (lg+): copyright, socials, and a real scroll-to-top. */
export function DashboardFooter() {
  const reduce = useReducedMotion();
  return (
    <footer className="hidden border-t border-line px-6 py-5 lg:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="text-xs text-fg-faint">
          2026 Floqex. Software, not financial advice.
        </p>
        <div className="flex items-center gap-1.5">
          {socials.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.href}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
              >
                <Icon size={16} />
              </a>
            );
          })}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
            aria-label="Back to top"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}
