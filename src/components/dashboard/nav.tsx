/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Robot,
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
  Moon,
  Globe,
  Question,
  BookOpen,
  Info,
  ShieldCheck,
  Code,
  ChartLineUp,
  CalendarBlank,
  MagnifyingGlass,
  Calculator,
  FlowArrow,
  Storefront,
  type Icon,
} from "@phosphor-icons/react";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import type { NavAccount } from "@/lib/queries";

type NavItem = { href: string; label: string; icon: Icon; pro?: boolean };

const NAVIGATE: NavItem[] = [
  { href: "/dashboard", label: "Main Dashboard", icon: SquaresFour },
  { href: "/dashboard/bots", label: "Bots & Automations", icon: Robot },
  { href: "/dashboard/copy-trading", label: "Copy Trading", icon: FlowArrow, pro: true },
  { href: "/dashboard/markets", label: "Markets", icon: MagnifyingGlass },
  { href: "/dashboard/trades", label: "Trades", icon: ChartLineUp },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarBlank },
  { href: "/dashboard/strategy", label: "Strategy Lab", icon: Flask },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: Storefront },
  { href: "/dashboard/calculators", label: "Calculators", icon: Calculator },
];

const MORE: NavItem[] = [
  { href: "/dashboard/settings", label: "Settings", icon: Gear },
  { href: "/dashboard/profile", label: "Preferences", icon: UserCircle },
  { href: "/dashboard/usage", label: "Usage", icon: ChartBar },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/docs", label: "Help Center", icon: Question },
];

const LINKS: NavItem[] = [
  { href: "/about", label: "About Service", icon: Info },
  { href: "/terms", label: "Terms & Conditions", icon: BookOpen },
  { href: "/security", label: "Security", icon: ShieldCheck },
  { href: "/api-docs", label: "API Docs", icon: Code },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/dashboard" ? pathname === href : (pathname?.startsWith(href) ?? false);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const isDocs = item.href === "/docs";
  
  return (
    <Link
      href={item.href}
      target={isDocs ? "_blank" : undefined}
      rel={isDocs ? "noopener noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-[var(--radius-pill)] min-h-[44px] py-2 pl-3 pr-4 text-[13px] font-medium transition-colors hover:text-fg",
        active ? "text-fg" : "text-fg-subtle",
        !active && "hover:bg-surface/50"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-[var(--radius-pill)] bg-surface"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span
        className={cn(
          "relative z-10 flex items-center justify-center transition-colors",
          active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted",
        )}
      >
        <Icon size={18} weight={active ? "duotone" : "regular"} />
      </span>
      <span className="relative z-10 flex-1 truncate">{item.label}</span>
      {active ? (
        <CaretRight size={14} weight="bold" className="relative z-10 shrink-0 text-fg-subtle" />
      ) : item.pro ? (
        <span className="relative z-10 shrink-0 rounded-[var(--radius-pill)] bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
          Pro
        </span>
      ) : null}
    </Link>
  );
}

function MiniLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2.5 rounded-[var(--radius-control)] min-h-[44px] py-1.5 pl-3 pr-3 text-[12px] font-medium text-fg-subtle transition-colors hover:text-fg hover:bg-surface/50"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
      {item.label}
    </Link>
  );
}

import { useSearchParams } from "next/navigation";

/** Collapsible section: a header with a rotating chevron. */
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
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full min-h-[44px] items-center justify-between px-3 pb-3 text-[12px] font-bold text-fg transition-colors hover:text-fg-muted"
      >
        {label}
        <CaretUp
          size={12}
          weight="bold"
          className={cn("text-fg-subtle transition-transform duration-200", !open && "rotate-180")}
        />
      </button>
      {open ? <div className="space-y-0.5">{children}</div> : null}
    </div>
  );
}

/** Real accounts with balances. */
function AccountRow({ account, isActive }: { account: NavAccount; isActive: boolean }) {
  const pathname = usePathname();
  // Keep them on the same dashboard page they are on, but swap the account parameter
  const href = `${pathname}?account=${account.id}`;
  
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center justify-between rounded-[var(--radius-pill)] min-h-[44px] py-2 pl-3 pr-4 transition-colors hover:text-fg",
        isActive ? "text-fg" : "text-fg-subtle",
        !isActive && "hover:bg-surface/50"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="account-active-pill"
          className="absolute inset-0 rounded-[var(--radius-pill)] bg-surface"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <div className="relative z-10 flex items-center gap-3 min-w-0">
        <span className={cn("flex items-center justify-center transition-colors", isActive ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")}>
          <Wallet size={18} weight={isActive ? "fill" : "regular"} />
        </span>
        <span className="truncate text-[13px] font-medium">
          {account.nickname}
        </span>
      </div>
      <span className={cn("relative z-10 tnum shrink-0 text-[12px] font-medium", isActive ? "text-accent font-bold" : "text-accent/70")}>
        <DisplayValue type="BALANCE" money={account.balance} />
      </span>
    </Link>
  );
}

/** Desktop sidebar, fixed 240px at lg+. */
export function Sidebar({ accounts = [] }: { accounts?: NavAccount[] }) {
  const isActiveRoute = useIsActive();
  const searchParams = useSearchParams();
  const activeAccountId = searchParams?.get("account") || (accounts.length > 0 ? accounts[0].id : undefined);
  
  return (
    <aside className="fixed bottom-0 left-0 top-16 hidden w-60 flex-col border-r border-line bg-base md:flex">
      <nav className="flex-1 overflow-y-auto px-4 pb-4 pt-6">
        <Section label="Navigate">
          {NAVIGATE.map((item) => {
            const hrefWithContext = activeAccountId ? `${item.href}?account=${activeAccountId}` : item.href;
            return <NavLink key={item.href} item={{...item, href: hrefWithContext}} active={isActiveRoute(item.href)} />;
          })}
        </Section>

        <Section label="Accounts">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} isActive={a.id === activeAccountId} />
          ))}
          <div className="mt-1.5 space-y-0.5 border-t border-line/60 pt-1.5">
            <Link
              href="/dashboard/accounts"
              aria-current={isActiveRoute("/dashboard/accounts") ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-[var(--radius-pill)] min-h-[44px] py-2 pl-3 pr-4 transition-colors hover:bg-surface/50 hover:text-fg",
                isActiveRoute("/dashboard/accounts") ? "text-fg" : "text-fg-subtle",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center transition-colors",
                  isActiveRoute("/dashboard/accounts")
                    ? "text-accent"
                    : "text-fg-subtle group-hover:text-fg-muted",
                )}
              >
                <Wallet size={18} weight={isActiveRoute("/dashboard/accounts") ? "fill" : "regular"} />
              </span>
              <span className="flex-1 truncate text-[13px] font-medium">Manage accounts</span>
              <CaretRight size={14} weight="bold" className="shrink-0 text-fg-subtle" />
            </Link>
            <Link
              href="/dashboard/accounts/new"
              className="group flex items-center gap-3 rounded-[var(--radius-pill)] min-h-[44px] py-2 pl-3 pr-4 text-fg-subtle transition-colors hover:bg-surface/50 hover:text-fg"
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[8px] border border-dashed border-line-strong text-fg-subtle transition-colors group-hover:border-accent group-hover:text-accent">
                <Plus size={12} weight="bold" />
              </span>
              <span className="truncate text-[13px] font-medium">Add new account</span>
            </Link>
          </div>
        </Section>

        <Section label="More">
          {MORE.map((item) => {
            const isDocs = item.href === "/docs";
            const hrefWithContext = activeAccountId && !isDocs ? `${item.href}?account=${activeAccountId}` : item.href;
            return <NavLink key={item.href} item={{...item, href: hrefWithContext}} active={isActiveRoute(item.href)} />;
          })}
        </Section>
        
        <Section label="Links">
          <div className="space-y-1">
            {LINKS.map((item) => (
              <MiniLink key={item.href} item={item} />
            ))}
          </div>
        </Section>
      </nav>
      
      <div className="p-4">
        <UserProfileBlock />
      </div>
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
    <div className="rounded-[var(--radius-card)] bg-surface p-3">
      <div className="flex items-center gap-3">
        {user.imageUrl ? (
          <Image src={user.imageUrl} alt={name} width={40} height={40} className="privacy-blur-avatar rounded-full object-cover shadow-[var(--shadow-sm)]" />
        ) : (
          <div className="privacy-blur-avatar h-10 w-10 rounded-full bg-accent-soft flex items-center justify-center text-accent font-medium text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="privacy-blur truncate text-[13px] font-bold text-fg">{name}</p>
          <p className="privacy-blur truncate text-[11px] text-fg-subtle">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>
    </div>
  );
}

/** Mobile bottom nav, below lg */
export function BottomNav() {
  const isActive = useIsActive();
  const settingsItem = MORE.find((i) => i.href === "/dashboard/settings");
  const items = settingsItem ? [...NAVIGATE.slice(0, 4), settingsItem] : NAVIGATE;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-elevated/95 backdrop-blur md:hidden">
      {items.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center min-h-[44px] gap-1 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-fg" : "text-fg-subtle",
            )}
          >
            <Icon size={22} weight={active ? "duotone" : "regular"} className={active ? "text-accent" : "text-fg-subtle"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

