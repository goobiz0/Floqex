"use client";

import { Info } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// A small "?" / info affordance with an accessible hover + keyboard tooltip.
// Use it next to a confusing label to explain what a setting does.
export function InfoTip({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("group relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={text}
        className="inline-flex text-fg-subtle outline-none transition-colors hover:text-fg focus-visible:text-fg"
      >
        <Info size={13} weight="bold" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-52 -translate-x-1/2 rounded-[var(--radius-control)] border border-line bg-overlay px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-fg shadow-[var(--shadow-md)] group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
