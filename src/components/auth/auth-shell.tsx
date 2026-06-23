import type { ReactNode } from "react";

/** Centered form container: heading, optional subtitle, content, optional footer. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-[28rem] rounded-[var(--radius-card)] bg-white/80 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-xl dark:bg-surface/80 dark:ring-white/10">
      <div className="mb-8">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle ? <p className="mt-2 text-center text-sm text-fg-muted">{subtitle}</p> : null}
      </div>
      {children}
      {footer ? <div className="mt-8 text-center text-sm text-fg-subtle">{footer}</div> : null}
    </div>
  );
}
