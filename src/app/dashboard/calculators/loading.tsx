/** Skeleton matching the calculators directory shape (per the design system,
 * loading states mirror the final layout rather than showing a spinner). */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-7 w-44 rounded-[var(--radius-control)]" />
        <div className="skeleton h-4 w-2/3 rounded-[var(--radius-control)]" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="skeleton h-10 w-full rounded-[var(--radius-control)] sm:max-w-xs" />
        <div className="skeleton h-8 w-72 rounded-[var(--radius-pill)]" />
      </div>

      {[0, 1].map((s) => (
        <div key={s} className="space-y-3">
          <div className="skeleton h-6 w-40 rounded-[var(--radius-control)]" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((c) => (
              <div key={c} className="skeleton h-[88px] rounded-[var(--radius-card)]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
