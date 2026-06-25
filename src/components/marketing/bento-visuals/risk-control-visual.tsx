"use client";

export function RiskControlVisual() {
  return (
    <div className="absolute inset-y-0 right-0 w-1/2 md:w-3/5 overflow-hidden flex items-center justify-end pr-8 pointer-events-none">
      <div className="relative w-48 rounded-[var(--radius-card)] border border-line bg-base shadow-[var(--shadow-sm)] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-fg-muted uppercase tracking-widest">Drawdown Limit</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tracking-tight text-fg tnum">1.2%</span>
          <span className="text-sm font-medium text-fg-subtle">/ 2.0%</span>
        </div>
        <div className="relative w-full h-1.5 bg-line rounded-full overflow-hidden">
          <div className="absolute top-0 bottom-0 left-[80%] w-[1px] bg-negative z-20" />
          <div className="h-full bg-accent relative z-10 w-[60%]" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-base via-base/50 to-transparent" />
    </div>
  );
}
