import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const mockupVariants = cva(
  "flex relative z-10 overflow-hidden shadow-[var(--shadow-xl)] border border-line",
  {
    variants: {
      type: {
        mobile: "rounded-[var(--radius-lg)] max-w-[350px]",
        responsive: "rounded-[var(--radius-card)]",
      },
    },
    defaultVariants: {
      type: "responsive",
    },
  },
);

export interface MockupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mockupVariants> {}

const Mockup = React.forwardRef<HTMLDivElement, MockupProps>(
  ({ className, type, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(mockupVariants({ type, className }))}
      {...props}
    />
  ),
);
Mockup.displayName = "Mockup";

const frameVariants = cva(
  "bg-accent/5 flex relative z-10 overflow-hidden rounded-[var(--radius-card)]",
  {
    variants: {
      size: {
        small: "p-2",
        large: "p-4",
      },
    },
    defaultVariants: {
      size: "small",
    },
  },
);

export interface MockupFrameProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof frameVariants> {}

const MockupFrame = React.forwardRef<HTMLDivElement, MockupFrameProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(frameVariants({ size, className }))}
      {...props}
    />
  ),
);
MockupFrame.displayName = "MockupFrame";

export { Mockup, MockupFrame };
