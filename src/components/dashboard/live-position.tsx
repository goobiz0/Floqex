import { ArrowUp } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";

/**
 * Live position card. One of the two surfaces allowed a glass treatment
 * (backdrop blur + inner highlight), per the design system.
 */
export function LivePosition() {
  // Sample open position
  const entry = 2418.6;
  const stop = 2414.4;
  const target = 2427.0;
  const current = 2424.1;
  const pct = ((current - stop) / (target - stop)) * 100;

  return (
    <div className="relative h-full overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-elevated/70 p-5 backdrop-blur-xl [box-shadow:inset_0_1px_0_oklch(1_0_0/0.06)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
          Live position
        </span>
        <Badge tone="positive" mono>
          +1.31R
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
          <ArrowUp size={16} weight="bold" />
        </span>
        <div>
          <p className="text-sm font-semibold text-fg">Gold</p>
          <p className="text-xs text-fg-subtle">XAU/USD · Long</p>
        </div>
        <p className="tnum ml-auto text-lg font-semibold text-positive">
          +$132.40
        </p>
      </div>

      {/* SL -> TP progress */}
      <div className="mt-6">
        <div className="relative h-1.5 rounded-full bg-surface">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-base bg-accent"
            style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[0.7rem]">
          <span className="tnum text-negative">SL {stop.toFixed(2)}</span>
          <span className="tnum text-fg-subtle">Entry {entry.toFixed(2)}</span>
          <span className="tnum text-positive">TP {target.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
