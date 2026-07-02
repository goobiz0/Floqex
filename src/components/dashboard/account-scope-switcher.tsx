"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { CaretDown, Stack, Wallet, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import { ALL_ACCOUNTS_ID } from "@/lib/account-scope";

export type ScopeAccount = { id: string; nickname: string; balance: number; mode: string };

/**
 * The one account switcher for the whole product: All Accounts (combined) or a
 * single real account. Lives in the topbar so it is reachable from every
 * dashboard surface, and writes the same `?account=` param the sidebar and
 * every server query already read, so switching here changes the dashboard,
 * calendar, trades, analytics and journal in lockstep.
 */
export function AccountScopeSwitcher({ accounts }: { accounts: ScopeAccount[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  const activeId = searchParams?.get("account") || accounts[0]?.id;
  const isAll = activeId === ALL_ACCOUNTS_ID;
  const activeAccount = accounts.find((a) => a.id === activeId);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const label = isAll ? "All Accounts" : activeAccount?.nickname ?? "Select account";
  const balance = isAll ? totalBalance : activeAccount?.balance ?? 0;

  const buildHref = (id: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("account", id);
    return `${pathname}?${params.toString()}`;
  };

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEscape);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (accounts.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface py-1.5 pl-2.5 pr-3 text-sm text-fg transition-colors hover:bg-surface-hover"
      >
        <span className="flex h-5 w-5 items-center justify-center text-accent">
          {isAll ? <Stack size={15} weight="fill" /> : <Wallet size={15} weight="fill" />}
        </span>
        <span className="hidden max-w-[120px] truncate font-medium sm:inline">{label}</span>
        <span className="hidden tnum text-xs text-fg-subtle md:inline">
          <DisplayValue type="BALANCE" money={balance} />
        </span>
        <CaretDown size={12} weight="bold" className={cn("text-fg-subtle transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            style={{ originX: 0, originY: 0 }}
            className="absolute left-0 z-40 mt-2 w-64 overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-lg"
          >
            <div className="max-h-[60vh] overflow-y-auto py-1.5">
              {accounts.length > 1 && (
                <>
                  <ScopeRow
                    href={buildHref(ALL_ACCOUNTS_ID)}
                    onNavigate={close}
                    icon={<Stack size={16} weight={isAll ? "fill" : "regular"} />}
                    label="All Accounts"
                    sublabel={`${accounts.length} accounts combined`}
                    balance={totalBalance}
                    active={isAll}
                  />
                  <div className="my-1.5 border-t border-line" />
                </>
              )}
              {accounts.map((a) => (
                <ScopeRow
                  key={a.id}
                  href={buildHref(a.id)}
                  onNavigate={close}
                  icon={<Wallet size={16} weight={a.id === activeId && !isAll ? "fill" : "regular"} />}
                  label={a.nickname}
                  sublabel={a.mode}
                  balance={a.balance}
                  active={a.id === activeId && !isAll}
                />
              ))}
            </div>
            <div className="border-t border-line px-4 py-2.5">
              <Link
                href="/dashboard/accounts"
                onClick={close}
                className="text-xs font-medium text-fg-subtle transition-colors hover:text-accent"
              >
                Manage accounts
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScopeRow({
  href,
  onNavigate,
  icon,
  label,
  sublabel,
  balance,
  active,
}: {
  href: string;
  onNavigate: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  balance: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      role="option"
      aria-selected={active}
      className={cn(
        "flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-surface-hover",
        active ? "text-fg" : "text-fg-subtle",
      )}
    >
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]", active ? "bg-accent-soft text-accent" : "bg-surface text-fg-subtle")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-fg">{label}</span>
        <span className="block truncate text-[11px] text-fg-faint">{sublabel}</span>
      </span>
      <span className="shrink-0 tnum text-xs font-medium text-fg-subtle">
        <DisplayValue type="BALANCE" money={balance} />
      </span>
      {active && <Check size={14} weight="bold" className="shrink-0 text-accent" />}
    </Link>
  );
}
