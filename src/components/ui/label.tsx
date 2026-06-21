import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Label, always rendered above its control (never placeholder-as-label). */
export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("block text-sm font-medium text-fg-muted", className)}
      {...props}
    />
  );
}
