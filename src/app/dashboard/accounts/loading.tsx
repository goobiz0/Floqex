import { Card } from "@/components/ui/card";

/** Skeleton matching the Accounts layout: summary, controls, then a card grid. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-32 animate-pulse rounded-[var(--radius-control)] bg-surface" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-[var(--radius-control)] bg-surface" />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-surface" />
            <div className="h-8 w-44 animate-pulse rounded bg-surface" />
            <div className="h-4 w-28 animate-pulse rounded bg-surface" />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-surface" />
                <div className="h-5 w-14 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 h-2 w-full animate-pulse rounded-[var(--radius-pill)] bg-surface" />
      </Card>

      <div className="flex items-center justify-between">
        <div className="h-9 w-64 max-w-[60%] animate-pulse rounded-[var(--radius-control)] bg-surface" />
        <div className="h-9 w-40 animate-pulse rounded-[var(--radius-control)] bg-surface" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-[var(--radius-control)] bg-surface" />
                <div className="space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-surface" />
                  <div className="h-3 w-16 animate-pulse rounded bg-surface" />
                </div>
              </div>
              <div className="h-5 w-12 animate-pulse rounded-[var(--radius-pill)] bg-surface" />
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div className="h-8 w-32 animate-pulse rounded bg-surface" />
              <div className="h-4 w-16 animate-pulse rounded bg-surface" />
            </div>
            <div className="mt-4 h-10 w-full animate-pulse rounded bg-surface" />
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-8 animate-pulse rounded bg-surface" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
