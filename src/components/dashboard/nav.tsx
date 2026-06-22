"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Robot,
  Notebook,
  Flask,
  ChartBar,
  Wallet,
  CreditCard,
  Gear,
  UserCircle,
  SignOut,
  CaretRight,
  CaretUp,
  Plus,
  type Icon,
} from "@phosphor-icons/react";
import { useUser, useClerk } from "@clerk/nextjs";
import { Wordmark } from "@/components/brand/wordmark";
import { cn, formatUSD } from "@/lib/utils";
import type { NavAccount } from "@/lib/queries";

type NavItem = { href: string; label: string; icon: Icon };

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/dashboard/bots", label: "Bots", icon: Robot },
  { href: "/dashboard/journal", label: "Journal", icon: Notebook },
  { href: "/dashboard/strategy", label: "Strategy", icon: Flask },
  { href: "/dashboard/analytics", label: "Analytics", icon: ChartBar },
];

const SETTINGS: NavItem[] = [
  { href: "/dashboard/accounts", label: "Accounts", icon: Wallet },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
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
        "group flex items-center gap-3 rounded-[var(--radius-control)] py-1.5 pl-1.5 pr-2.5 text-sm transition-colors",
        active
          ? "bg-surface text-fg shadow-[var(--shadow-sm)]"
          : "text-fg-muted hover:bg-surface/50 hover:text-fg",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition-colors",
          active
            ? "bg-accent-soft text-accent"
            : "text-fg-subtle group-hover:text-fg-muted",
        )}
      >
        <Icon size={18} weight={active ? "fill" : "regular"} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      <CaretRight
        size={13}
        weight="bold"
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-fg-subtle" : "text-fg-faint group-hover:text-fg-subtle",
        )}
      />
    </Link>
  );
}

/** Collapsible section: a header with a rotating chevron, like the reference rail. */
function Section({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 pb-1.5 pt-5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-fg-faint transition-colors hover:text-fg-subtle"
      >
        {label}
        <CaretUp
          size={12}
          weight="bold"
          className={cn("transition-transform duration-200", !open && "rotate-180")}
        />
      </button>
      {open ? <div className="space-y-0.5">{children}</div> : null}
    </div>
  );
}

/** Real accounts with balances, mirroring the reference "Accounts and Cards" rail. */
function AccountRow({ account }: { account: NavAccount }) {
  return (
    <Link
      href="/dashboard/accounts"
      className="group flex items-center gap-2.5 rounded-[var(--radius-control)] py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-surface/50"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-surface text-fg-subtle group-hover:text-fg-muted">
        <Wallet size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-fg-muted group-hover:text-fg">
        {account.nickname}
      </span>
      <span className="tnum shrink-0 text-xs font-medium text-fg-subtle">
        {formatUSD(account.balance)}
      </span>
    </Link>
  );
}

/** Desktop sidebar, fixed 240px at lg+ */
export function Sidebar({ accounts = [] }: { accounts?: NavAccount[] }) {
  const isActive = useIsActive();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-elevated lg:flex">
      <div className="px-5 py-5">
        <Link href="/dashboard">
          <Wordmark />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        <Section label="Navigate">
          {MAIN.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </Section>

        {accounts.length > 0 ? (
          <Section label="Accounts">
            {accounts.map((a) => (
              <AccountRow key={a.id} account={a} />
            ))}
            <Link
              href="/dashboard/accounts"
              className="mt-1 flex items-center gap-2.5 rounded-[var(--radius-control)] border border-dashed border-line py-1.5 pl-2 pr-2.5 text-sm text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-fg-faint">
                <Plus size={14} weight="bold" />
              </span>
              Add account
            </Link>
          </Section>
        ) : null}

        <Section label="Manage">
          {SETTINGS.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </Section>
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
          // eslint-disable-next-line @next/next/no-img-element
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
  // Pick the mobile settings entry by route, not array index, so reordering
  // SETTINGS (e.g. adding Billing) can't silently swap which item appears.
  const settingsItem = SETTINGS.find((i) => i.href === "/dashboard/settings");
  const items = settingsItem ? [...MAIN, settingsItem] : MAIN;
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
