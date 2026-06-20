import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Surface card. Border XOR shadow, never both (design-system rule).
 * Default uses a 1px border on an elevated surface.
 */
export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-elevated",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 pt-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">
      {children}
    </h3>
  );
}
