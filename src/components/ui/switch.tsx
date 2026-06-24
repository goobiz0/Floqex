"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "group relative flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base",
        checked ? "bg-profit border border-profit" : "bg-surface border border-line-strong hover:bg-surface-hover"
      )}
    >
      <span className="sr-only">{label || "Toggle"}</span>
      <span
        className={cn(
          "pointer-events-none absolute left-[1px] top-[1px] h-5 w-5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-0 transition-transform duration-200 ease-in-out",
          checked ? "translate-x-[20px] bg-white" : "translate-x-0 bg-fg-muted group-hover:bg-fg-subtle"
        )}
      />
    </button>
  );
}
