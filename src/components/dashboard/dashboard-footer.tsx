"use client";

import { XLogo, FacebookLogo, InstagramLogo, PinterestLogo, ArrowUp, CaretDown, ChatCircle, type Icon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";

const socials: { href: string; label: string; icon: Icon }[] = [
  { href: "https://facebook.com/floqex", label: "Facebook", icon: FacebookLogo },
  { href: "https://x.com/floqex", label: "X", icon: XLogo },
  { href: "https://instagram.com/floqex", label: "Instagram", icon: InstagramLogo },
  { href: "https://pinterest.com/floqex", label: "Pinterest", icon: PinterestLogo },
];

/** Slim dashboard footer (lg+): matching the reference design */
export function DashboardFooter() {
  const reduce = useReducedMotion();
  return (
    <footer className="hidden border-t border-line px-6 py-5 lg:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="text-[13px] font-medium text-fg-subtle">
          © 2078 Global Inc.
        </p>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {socials.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.href}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
                >
                  <Icon size={14} weight="fill" />
                </a>
              );
            })}
          </div>
          
          <button className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line px-3 py-1.5 text-[13px] font-medium text-fg transition-colors hover:border-line-strong">
            English Language
            <CaretDown size={14} weight="bold" className="text-fg-subtle" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Chat Support"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-fg-subtle transition-colors hover:text-fg hover:bg-surface/50"
          >
            <ChatCircle size={16} weight="fill" />
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
            aria-label="Back to top"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
          >
            <ArrowUp size={16} weight="bold" />
          </button>
        </div>
      </div>
    </footer>
  );
}
