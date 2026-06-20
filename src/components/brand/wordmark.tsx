import { cn } from "@/lib/utils";

/**
 * Floqex mark: an emerald tile holding an ascending line (an equity curve).
 * Simple geometric glyph, on-brand, not decorative filler.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-7 w-7", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <path
        d="M7 21.5 L13 14.5 L17.5 18 L25 9"
        className="stroke-base"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25" cy="9" r="2.1" className="fill-base" />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark className={markClassName} />
      <span className="text-lg font-semibold tracking-tight text-fg">
        Floqex
      </span>
    </span>
  );
}
