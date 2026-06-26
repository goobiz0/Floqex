import { Card, CardTitle } from "@/components/ui/card";
import { Robot } from "@phosphor-icons/react/dist/ssr";
import type { MochiUsageSummary } from "@/lib/mochi-usage";

const fmt = (n: number) => n.toLocaleString();

function Meter({ label, used, limit, hint }: { label: string; used: number; limit: number; hint: string }) {
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100);
  const danger = pct >= 100;
  const warn = pct >= 80 && !danger;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-fg">{label}</span>
        <span className="tnum text-fg-subtle">
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface">
        <div
          className={danger ? "h-full rounded-[var(--radius-pill)] bg-negative" : warn ? "h-full rounded-[var(--radius-pill)] bg-warning" : "h-full rounded-[var(--radius-pill)] bg-accent"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-fg-subtle">{hint}</p>
    </div>
  );
}

// Shared Mochi usage panel used on both the Usage page and the Billing page.
export function MochiUsageCard({ usage, plan }: { usage: MochiUsageSummary; plan: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Robot size={18} weight="fill" className="text-accent" />
          <CardTitle>Mochi AI usage</CardTitle>
        </div>
        <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          {plan} plan
        </span>
      </div>
      <p className="mt-1 text-sm text-fg-subtle">
        Mochi runs on a token budget. The 5-hour window is a burst guard; the weekly window is your overall allowance.
      </p>
      <div className="mt-5 space-y-5">
        <Meter label="Last 5 hours" used={usage.used5h} limit={usage.limit5h} hint="Resets continuously as the rolling 5-hour window moves forward." />
        <Meter label="This week" used={usage.usedWeek} limit={usage.limitWeek} hint="Rolling 7-day allowance for your plan." />
      </div>
      {usage.blocked && (
        <p className="mt-4 rounded-[var(--radius-control)] border border-negative/30 bg-negative-soft px-3 py-2 text-sm text-negative">
          You&apos;ve reached your {usage.window === "week" ? "weekly" : "5-hour"} limit. It frees up as the window rolls forward, or upgrade your plan for a larger allowance.
        </p>
      )}
    </Card>
  );
}
