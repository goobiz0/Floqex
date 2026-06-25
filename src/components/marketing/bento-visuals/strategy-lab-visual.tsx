"use client";

export function StrategyLabVisual() {
  return (
    <div className="absolute inset-x-0 top-0 h-[200px] flex items-start justify-center pt-8 overflow-hidden pointer-events-none">
      <div className="relative flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-base shadow-[var(--shadow-sm)] px-3 py-2 text-xs font-medium text-fg">
          <div className="h-2 w-2 rounded-sm bg-accent/20 border border-accent/40" />
          Price &gt; High
        </div>
        <div className="h-4 w-px bg-line-strong" />
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-base shadow-[var(--shadow-sm)] px-3 py-2 text-xs font-medium text-fg">
          <div className="h-2 w-2 rounded-full bg-profit/20 border border-profit/40" />
          Execute Long
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base/50 to-base" />
    </div>
  );
}
