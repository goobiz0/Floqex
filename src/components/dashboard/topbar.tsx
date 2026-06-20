import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Countdown } from "@/components/dashboard/countdown";
import { EmergencyStop } from "@/components/dashboard/emergency-stop";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-base/80 px-4 backdrop-blur lg:px-6">
      {/* Account selector */}
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-2.5 py-1.5 text-sm transition-colors hover:border-line-strong"
      >
        <span className="font-medium text-fg">Main account</span>
        <Badge tone="neutral" className="hidden sm:inline-flex">
          Paper
        </Badge>
        <CaretDown size={14} className="text-fg-subtle" />
      </button>

      {/* Status cluster */}
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <StatusDot tone="positive" pulse />
          <span className="hidden sm:inline">Running</span>
        </span>
        <Countdown />
        <EmergencyStop />
      </div>
    </header>
  );
}
