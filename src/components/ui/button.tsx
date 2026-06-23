import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium whitespace-nowrap " +
  "transition-[transform,background-color,border-color,color,opacity] duration-150 ease-[var(--ease-out)] " +
  "active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-fg text-[var(--color-base)] hover:bg-fg/90 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-inset ring-fg/5",
  secondary:
    "bg-surface/80 text-fg ring-1 ring-inset ring-black/5 dark:ring-white/10 hover:bg-surface shadow-sm backdrop-blur-md",
  outline:
    "ring-1 ring-inset ring-line text-fg hover:ring-line-strong hover:bg-surface/60",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface/60",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children" | "href"> & {
    href: string;
  };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in props && props.href !== undefined) {
    const { variant: _v, size: _s, className: _c, children: _ch, ...rest } =
      props;
    return (
      <Link className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, href: _h, ...rest } =
    props as ButtonAsButton;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
