"use client";

import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border select-none outline-none",
        "transition-[transform,background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out)]",
        "active:scale-[0.88] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        checked
          ? "bg-accent border-accent text-[var(--color-on-accent)] shadow-[0_1px_3px_rgba(16,185,129,0.2)]"
          : "bg-surface border-line hover:bg-surface-hover hover:border-line-strong",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none"
      )}
    >
      <span className="sr-only">{label || "Checkbox"}</span>
      <span
        className={cn(
          "flex items-center justify-center transition-all duration-150 ease-[var(--ease-out)]",
          checked ? "scale-100 opacity-100" : "scale-75 opacity-0"
        )}
      >
        <Check size={12} weight="bold" />
      </span>
    </button>
  );
}
