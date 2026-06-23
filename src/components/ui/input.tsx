import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input"> & {
  invalid?: boolean;
  /** Leading icon (Phosphor at ~16px). Renders inside the control, reference-style. */
  icon?: ReactNode;
  /** Trailing adornment (suffix, unit, or small button). */
  trailing?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, icon, trailing, ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-[var(--radius-control)] border bg-surface/80 text-sm text-fg shadow-sm backdrop-blur-md",
        "placeholder:text-fg-faint transition-all duration-200 ease-[var(--ease-out)]",
        "focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/10 disabled:pointer-events-none disabled:opacity-50",
        icon ? "pl-9" : "pl-3",
        trailing ? "pr-9" : "pr-3",
        invalid ? "border-negative" : "border-line",
        className,
      )}
      {...props}
    />
  );

  if (!icon && !trailing) return control;

  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted [&_svg]:h-[18px] [&_svg]:w-[18px]">
          {icon}
        </span>
      ) : null}
      {control}
      {trailing ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
          {trailing}
        </span>
      ) : null}
    </div>
  );
});
