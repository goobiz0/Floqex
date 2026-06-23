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
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight text-fg">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-fg-muted">{subtitle}</p> : null}
      </div>
      {children}
      {footer ? <div className="mt-8 text-sm text-fg-subtle">{footer}</div> : null}
    </div>
  );
}
