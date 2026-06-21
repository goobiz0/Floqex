"use client";

import { GoogleLogo, GithubLogo } from "@phosphor-icons/react";

export type OAuthStrategy = "oauth_google" | "oauth_github";

const providers: { strategy: OAuthStrategy; label: string; Icon: typeof GoogleLogo }[] = [
  { strategy: "oauth_google", label: "Google", Icon: GoogleLogo },
  { strategy: "oauth_github", label: "GitHub", Icon: GithubLogo },
];

export function SocialButtons({
  onSelect,
  disabled,
}: {
  onSelect: (strategy: OAuthStrategy) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map(({ strategy, label, Icon }) => (
        <button
          key={strategy}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(strategy)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface text-sm font-medium text-fg transition-[transform,background-color,border-color] duration-150 ease-[var(--ease-out)] hover:border-line-strong hover:bg-overlay active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon size={18} weight="bold" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
