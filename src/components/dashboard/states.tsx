import { Card } from "@/components/ui/card";

/** Shown when a dashboard data query fails (backend/transient error), so a real
 *  outage is never mistaken for a brand-new "no account yet" empty state. */
export function DashboardError() {
  return (
    <Card className="p-10 text-center">
      <p className="text-sm text-fg-muted">Something went wrong</p>
      <p className="mt-1 text-xs text-fg-subtle">
        We couldn&apos;t load your data right now. Please refresh in a moment.
      </p>
    </Card>
  );
}
