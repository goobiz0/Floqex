"use client";

import type { ReactNode } from "react";
import { ChartLine } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the metric widgets. Matches the existing standalone-widget
 * header pattern (icon + title on a hairline, accent-tinted glyph) so every
 * library widget reads the same. The outer card (border, radius, bg-elevated)
 * is supplied by the widget grid container; this adds the titled header and a
 * flex body that owns its own overflow.
 */
export function WidgetShell({
  icon,
  title,
  right,
  children,
}: {
  icon: ReactNode;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-elevated text-fg">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 text-accent">{icon}</span>
          <h3 className="truncate text-[13px] font-semibold tracking-wide">{title}</h3>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/** Composed empty state, distinct from a spinner. Explains how the data fills. */
export function WidgetEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-surface text-fg-faint">
        <ChartLine size={18} weight="duotone" />
      </span>
      <p className="max-w-[26ch] text-xs leading-relaxed text-fg-subtle">{message}</p>
    </div>
  );
}

/** A labelled metric value. P&L tones use profit/negative, never the brand accent. */
export function Stat({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "warning";
  sub?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</span>
      <span
        className={cn(
          "tnum text-lg font-semibold leading-none tracking-tight",
          tone === "positive" && "text-profit",
          tone === "negative" && "text-negative",
          tone === "warning" && "text-warning",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </span>
      {sub ? <span className="text-[11px] leading-tight text-fg-faint">{sub}</span> : null}
    </div>
  );
}

/** Small pill used for the right-hand window/scope badge on a widget header. */
export function WidgetBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 text-[10px] font-medium tracking-wide text-fg-subtle">
      {children}
    </span>
  );
}
