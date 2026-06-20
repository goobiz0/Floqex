import type { Icon } from "@phosphor-icons/react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Composed empty state for dashboard routes that are specced but not yet built.
 * Shows what the page will do rather than a blank screen.
 */
export function PageStub({
  title,
  icon: Icon,
  description,
  planned,
}: {
  title: string;
  icon: Icon;
  description: string;
  planned: string[];
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
      <Card className="mx-auto max-w-2xl p-8 text-center sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-accent-soft text-accent">
          <Icon size={28} />
        </div>
        <div className="mt-5 flex justify-center">
          <Badge tone="accent">In development</Badge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-fg">
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-pretty leading-relaxed text-fg-muted">
          {description}
        </p>
        <ul className="mx-auto mt-8 grid max-w-md gap-2.5 text-left">
          {planned.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" />
              <span className="text-sm text-fg-muted">{p}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
