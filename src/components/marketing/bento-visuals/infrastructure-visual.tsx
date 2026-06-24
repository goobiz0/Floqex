"use client";

export function InfrastructureVisual() {
  return (
    <div className="absolute inset-y-0 right-0 w-1/2 md:w-3/5 overflow-hidden flex items-center justify-end pr-8 pointer-events-none">
      <div className="relative w-48 rounded-[var(--radius-card)] border border-line bg-base shadow-[var(--shadow-sm)] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-fg-muted uppercase tracking-widest">Execution</span>
          <div className="flex h-1.5 w-1.5 rounded-full bg-accent" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tracking-tight text-fg tnum">0.8</span>
          <span className="text-sm font-medium text-fg-subtle">ms</span>
        </div>
        <div className="flex gap-1 h-8 items-end opacity-30">
          {[40, 25, 45, 30, 20, 50, 35, 15, 40].map((h, i) => (
            <div key={i} className="w-full bg-accent rounded-t-[2px]" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent" />
    </div>
  );
}
