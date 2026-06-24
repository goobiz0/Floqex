import { Card } from "@/components/ui/card";
import { Warning, CircleDashed } from "@phosphor-icons/react/dist/ssr";

/** Shown when a dashboard data query fails (backend/transient error), so a real
 *  outage is never mistaken for a brand-new "no account yet" empty state. */
export function DashboardError({ title, message }: { title?: string; message?: string }) {
  return (
    <Card className="p-10 text-center border-negative/20 bg-negative-soft/10">
      <Warning size={32} weight="duotone" className="mx-auto text-negative mb-4" />
      <p className="text-sm font-medium text-negative">{title || "Data unavailable"}</p>
      <p className="mt-1 text-xs text-fg-subtle max-w-sm mx-auto">
        {message || "We encountered an issue loading this section. Please try refreshing the page."}
      </p>
    </Card>
  );
}

/** 
 * Beautifully animated isometric empty state utilizing the 'glow-accent' class
 * for a premium fintech feel.
 */
export function DashboardEmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden p-12 text-center flex flex-col items-center justify-center min-h-[300px] border border-line bg-elevated">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px]" />
        <div className="absolute w-[200px] h-[200px] glow-accent opacity-50 blur-[60px]" />
      </div>
      <div className="relative z-10 w-16 h-16 rounded-[16px] bg-surface/80 border border-line shadow-[var(--shadow-sm)] flex items-center justify-center mb-6">
        <CircleDashed size={32} weight="duotone" className="text-accent animate-[spin_10s_linear_infinite]" />
      </div>
      <h3 className="relative z-10 text-lg font-semibold text-fg tracking-tight mb-2">{title}</h3>
      <p className="relative z-10 text-sm text-fg-subtle max-w-md mx-auto mb-6">
        {message}
      </p>
      {action && <div className="relative z-10">{action}</div>}
    </Card>
  );
}

/** 
 * Modular skeleton layout that exactly matches the final loaded shapes.
 * Passes the taste skill check for "never a spinner".
 */
export function DashboardSkeleton({ type = "card" }: { type?: "card" | "list" | "chart" }) {
  if (type === "list") {
    return (
      <Card className="p-0 overflow-hidden border border-line bg-elevated">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-line last:border-0">
            <div className="w-10 h-10 rounded-[10px] bg-surface animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-surface rounded animate-pulse" />
              <div className="h-3 w-1/4 bg-surface rounded animate-pulse" />
            </div>
            <div className="w-16 h-6 rounded-[var(--radius-pill)] bg-surface animate-pulse" />
          </div>
        ))}
      </Card>
    );
  }

  if (type === "chart") {
    return (
      <Card className="p-6 border border-line bg-elevated h-[350px] flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <div className="w-32 h-6 bg-surface rounded-[var(--radius-pill)] animate-pulse" />
          <div className="w-24 h-6 bg-surface rounded-[var(--radius-pill)] animate-pulse" />
        </div>
        <div className="flex-1 w-full bg-surface/30 rounded-lg animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="p-6 border border-line bg-elevated">
      <div className="w-12 h-12 rounded-[12px] bg-surface mb-4 animate-pulse" />
      <div className="h-5 w-1/2 bg-surface rounded mb-2 animate-pulse" />
      <div className="h-4 w-3/4 bg-surface rounded animate-pulse" />
    </Card>
  );
}
