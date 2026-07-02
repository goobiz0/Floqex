import { Wallet } from "@phosphor-icons/react/dist/ssr";

/** Pill shown next to a page title whenever the combined "All Accounts" scope is active. */
export function AllAccountsBadge({ count }: { count?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
      <Wallet size={12} weight="fill" />
      All Accounts{count ? ` · ${count}` : ""}
    </span>
  );
}
