import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input"> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-[var(--radius-control)] border bg-surface px-3 text-sm text-fg",
        "placeholder:text-fg-faint transition-colors duration-150 ease-[var(--ease-out)]",
        "focus:border-accent disabled:pointer-events-none disabled:opacity-50",
        invalid ? "border-negative" : "border-line",
        className,
      )}
      {...props}
    />
  );
});
