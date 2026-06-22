import { ReactNode } from "react";
import { FolderSimpleDashed } from "@phosphor-icons/react/dist/ssr";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-line text-fg-subtle">
        {icon || <FolderSimpleDashed size={32} weight="duotone" />}
      </div>
      <h3 className="mb-1 text-lg font-medium text-fg">{title}</h3>
      <p className="mb-6 max-w-[250px] text-sm text-fg-muted">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
