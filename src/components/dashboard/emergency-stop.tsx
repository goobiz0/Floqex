"use client";

import { useState } from "react";
import { HandPalm } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function EmergencyStop() {
  const [stopped, setStopped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setStopped((s) => !s)}
      aria-pressed={stopped}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium",
        "transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative",
        stopped
          ? "border border-line bg-surface text-fg-muted"
          : "bg-negative text-fg hover:brightness-110",
      )}
    >
      <HandPalm size={16} weight="bold" />
      <span className="hidden sm:inline">
        {stopped ? "Resume bot" : "Emergency stop"}
      </span>
    </button>
  );
}
