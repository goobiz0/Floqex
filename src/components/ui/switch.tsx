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
        // Ring instead of border so the 44x24 track keeps a clean box and the
        // knob math stays exact. Focus uses outline to avoid clashing the ring.
        "group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full ring-1 ring-inset outline-none transition-colors duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        checked
          ? "bg-accent ring-accent/60"
          : "bg-surface ring-line-strong hover:bg-surface-hover",
      )}
    >
      <span className="sr-only">{label || "Toggle"}</span>
      <span
        className={cn(
          // top-1/2 + -translate-y-1/2 centers vertically regardless of ring;
          // left-0.5 (2px) with translate-x-5 (20px) leaves a symmetric 2px gap.
          "pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-transform duration-200 ease-[var(--ease-out)] group-active:w-[22px]",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
