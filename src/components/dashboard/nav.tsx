"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Notebook,
  Flask,
  ChartBar,
  Wallet,
  CreditCard,
  Gear,
  SignOut,
  type Icon,
} from "@phosphor-icons/react";
import { useUser, useClerk } from "@clerk/nextjs";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: Icon };

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/dashboard/journal", label: "Journal", icon: Notebook },
  { href: "/dashboard/strategy", label: "Strategy", icon: Flask },
  { href: "/dashboard/analytics", label: "Analytics", icon: ChartBar },
];

const SETTINGS: NavItem[] = [
  { href: "/dashboard/accounts", label: "Accounts", icon: Wallet },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Gear },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent-soft text-fg"
          : "text-fg-muted hover:bg-surface/70 hover:text-fg",
      )}
    >
      {active && (
        <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent" />
      )}
      <Icon
        size={20}
        weight={active ? "fill" : "regular"}
        className={active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted"}
      />
      {item.label}
    </Link>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1.5 pt-5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-fg-faint">
      {children}
    </p>
  );
}

/** Desktop sidebar, fixed 240px at lg+ */
export function Sidebar() {
  const isActive = useIsActive();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-elevated lg:flex">
      <div className="px-5 py-5">
        <Link href="/dashboard">
          <Wordmark />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        <SectionLabel>Main</SectionLabel>
        <div className="space-y-0.5">
          {MAIN.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
        <SectionLabel>Settings</SectionLabel>
        <div className="space-y-0.5">
          {SETTINGS.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>
      <UserProfileBlock />
    </aside>
  );
}

function UserProfileBlock() {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  const name = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.primaryEmailAddress?.emailAddress || "User";

  return (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 mb-3">
        {user.imageUrl ? (
          <img src={user.imageUrl} alt={name} className="h-8 w-8 rounded-[var(--radius-control)] object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-[var(--radius-control)] bg-accent-soft flex items-center justify-center text-accent font-medium text-xs">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{name}</p>
          <p className="truncate text-xs text-fg-subtle">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-control)] py-1.5 text-xs font-medium text-fg-muted hover:bg-surface hover:text-fg transition-colors"
      >
        <SignOut size={14} />
        Sign out
      </button>
    </div>
  );
}

/** Mobile bottom nav, below lg */
export function BottomNav() {
  const isActive = useIsActive();
  const items = [...MAIN, SETTINGS[1]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-elevated/95 backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium transition-colors",
              active ? "text-accent" : "text-fg-subtle",
            )}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
