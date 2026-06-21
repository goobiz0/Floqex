import { ArrowUp, ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OpenPosition = {
  instrument: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stop: number;
  target: number;
};

/**
 * Live position card. One of the two surfaces allowed a glass treatment
 * (backdrop blur + inner highlight), per the design system. Renders the real
 * open trade, or a composed empty state when there is none.
 */
export function LivePosition({ position }: { position: OpenPosition | null }) {
  if (!position) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-5">
        <span className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
          Live position
        </span>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
          <p className="text-sm text-fg-muted">No open position</p>
          <p className="text-xs text-fg-subtle">The bot opens trades during active sessions.</p>
        </div>
      </div>
    );
  }

  const long = position.direction === "LONG";
  const Icon = long ? ArrowUp : ArrowDown;

  return (
    <div className="relative h-full overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-elevated/70 p-5 backdrop-blur-xl [box-shadow:inset_0_1px_0_oklch(1_0_0/0.06)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
          Live position
        </span>
        <Badge tone="neutral" mono>
          In progress
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)]",
            long ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
          )}
        >
          <Icon size={16} weight="bold" />
        </span>
        <div>
          <p className="text-sm font-semibold text-fg">{position.instrument}</p>
          <p className="text-xs text-fg-subtle">{long ? "Long" : "Short"}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[0.7rem] text-negative">Stop</dt>
          <dd className="tnum text-sm text-fg">{position.stop.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-[0.7rem] text-fg-subtle">Entry</dt>
          <dd className="tnum text-sm text-fg">{position.entry.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-[0.7rem] text-positive">Target</dt>
          <dd className="tnum text-sm text-fg">{position.target.toFixed(2)}</dd>
        </div>
      </dl>
    </div>
  );
}
