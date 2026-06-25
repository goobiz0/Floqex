import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "positive" | "negative" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-surface text-fg-muted border border-line",
  accent: "bg-accent-soft text-accent border border-transparent",
  positive: "bg-accent-soft text-positive border border-transparent",
  negative: "bg-negative-soft text-negative border border-transparent",
  warning: "bg-warning-soft text-warning border border-transparent",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  mono,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium",
        mono && "font-mono tabular-nums",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Semantic status dot. Only used for real state (e.g. bot status). */
export function StatusDot({
  tone = "positive",
  pulse,
  className,
}: {
  tone?: "positive" | "negative" | "warning" | "neutral";
  pulse?: boolean;
  className?: string;
}) {
  const color =
    tone === "positive"
      ? "bg-positive"
      : tone === "negative"
        ? "bg-negative"
        : tone === "warning"
          ? "bg-warning"
          : "bg-fg-faint";
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping",
            color,
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
}
