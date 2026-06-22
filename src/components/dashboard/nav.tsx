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
  Moon,
  Globe,
  Question,
  BookOpen,
  Info,
  ShieldCheck,
  Code,
  type Icon,
} from "@phosphor-icons/react";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn, formatUSD } from "@/lib/utils";
import type { NavAccount } from "@/lib/queries";

type NavItem = { href: string; label: string; icon: Icon };

const NAVIGATE: NavItem[] = [
  { href: "/dashboard", label: "Main Dashboard", icon: SquaresFour },
  { href: "/dashboard/bots", label: "Bots & Automations", icon: Robot },
  { href: "/dashboard/journal", label: "Journal & History", icon: Notebook },
  { href: "/dashboard/strategy", label: "Strategy Lab", icon: Flask },
  { href: "/dashboard/analytics", label: "Analytics & PnL", icon: ChartBar },
];

const MORE: NavItem[] = [
  { href: "/dashboard/settings", label: "Settings", icon: Gear },
  { href: "/dashboard/profile", label: "Preferences", icon: UserCircle },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/help", label: "Help Center", icon: Question },
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
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-[var(--radius-pill)] py-2 pl-3 pr-4 text-[13px] font-medium transition-colors",
        active
          ? "bg-surface text-fg"
          : "text-fg-subtle hover:bg-surface/50 hover:text-fg",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center transition-colors",
          active ? "text-fg" : "text-fg-subtle group-hover:text-fg-muted",
        )}
      >
        <Icon size={18} weight={active ? "fill" : "regular"} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {active ? (
        <CaretRight size={14} weight="bold" className="shrink-0 text-fg-subtle" />
      ) : null}
    </Link>
  );
}

function MiniLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2.5 rounded-[var(--radius-control)] py-1.5 pl-3 pr-3 text-[12px] font-medium text-fg-subtle transition-colors hover:text-fg hover:bg-surface/50"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
      {item.label}
    </Link>
  );
}

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
        className="flex w-full items-center justify-between px-3 pb-3 text-[12px] font-bold text-fg transition-colors hover:text-fg-muted"
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
function AccountRow({ account }: { account: NavAccount }) {
  return (
    <Link
      href="/dashboard/accounts"
      className="group flex items-center justify-between rounded-[var(--radius-pill)] py-2 pl-3 pr-4 transition-colors hover:bg-surface/50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center justify-center text-fg-subtle group-hover:text-fg-muted">
          <Wallet size={18} />
        </span>
        <span className="truncate text-[13px] font-medium text-fg-subtle group-hover:text-fg">
          {account.nickname}
        </span>
      </div>
      <span className="tnum shrink-0 text-[12px] font-medium text-accent">
        {formatUSD(account.balance)}
      </span>
    </Link>
  );
}

/** Desktop sidebar, fixed 240px at lg+. */
export function Sidebar({ accounts = [] }: { accounts?: NavAccount[] }) {
  const isActive = useIsActive();
  
  return (
    <aside className="fixed bottom-0 left-0 top-16 hidden w-64 flex-col border-r border-line bg-base lg:flex">
      <nav className="flex-1 overflow-y-auto px-4 pb-4 pt-6">
        <Section label="Navigate">
          {NAVIGATE.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </Section>

        <Section label="Accounts and Cards">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} />
          ))}
          <Link
            href="/dashboard/accounts"
            className="group mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-line py-2 pl-3 pr-4 text-[13px] font-medium text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
          >
            <span className="flex items-center justify-center rounded-full bg-surface p-1 text-fg-faint group-hover:text-fg-subtle">
              <Plus size={12} weight="bold" />
            </span>
            Add New Product
          </Link>
        </Section>

        <Section label="More">
          {MORE.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <button className="group flex w-full items-center gap-3 rounded-[var(--radius-pill)] py-2 pl-3 pr-4 text-[13px] font-medium text-fg-subtle transition-colors hover:bg-surface/50 hover:text-fg">
            <span className="flex items-center justify-center text-fg-subtle group-hover:text-fg-muted">
              <Moon size={18} />
            </span>
            <span className="flex-1 text-left truncate">Night Mode</span>
            {/* Toggle switch visual */}
            <div className="h-5 w-9 rounded-full bg-line relative flex items-center p-0.5">
              <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
            </div>
          </button>
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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt={name} className="h-10 w-10 rounded-full object-cover shadow-sm" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-accent-soft flex items-center justify-center text-accent font-medium text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-fg">{name}</p>
          <p className="truncate text-[11px] text-fg-subtle">{user.primaryEmailAddress?.emailAddress}</p>
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
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-fg" : "text-fg-subtle",
            )}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} className={active ? "text-fg" : "text-fg-subtle"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

