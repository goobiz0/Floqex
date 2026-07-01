"use client";

import { useState, useTransition } from "react";
import { HandPalm } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import { emergencyStop } from "@/app/dashboard/accounts/actions";

export function EmergencyStop() {
  const [stopped, setStopped] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleStop() {
    startTransition(async () => {
      const res = await emergencyStop();
      if (res.ok) {
        posthog.capture("emergency_stop_triggered");
        setStopped(true);
        setTimeout(() => setStopped(false), 5000); // Revert UI after a few seconds
      } else {
        alert(res.error);
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending || stopped}
      onClick={handleStop}
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
