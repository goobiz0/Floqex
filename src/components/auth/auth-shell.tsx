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
    <div className="w-full max-w-[25rem]">
      <div className="mb-6">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p> : null}
      </div>
      {children}
      {footer ? <div className="mt-6 text-sm text-fg-subtle">{footer}</div> : null}
    </div>
  );
}
