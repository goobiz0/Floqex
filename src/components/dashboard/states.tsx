import { Card } from "@/components/ui/card";

/** Shown when a dashboard data query fails (backend/transient error), so a real
 *  outage is never mistaken for a brand-new "no account yet" empty state. */
export function DashboardError({ title, message }: { title?: string; message?: string }) {
  return (
    <Card className="p-10 text-center border-negative/20 bg-negative-soft/10">
      <p className="text-sm font-medium text-negative">{title || "Data unavailable"}</p>
      <p className="mt-1 text-xs text-fg-subtle max-w-sm mx-auto">
        {message || "We encountered an issue loading this section. Please try refreshing the page."}
      </p>
    </Card>
  );
}
