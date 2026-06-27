import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WIDGET_CONFIGURABLE } from "./widget-grid";

type WidgetConfigDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  widgetType: string | null;
  config: Record<string, unknown>;
  onSave: (newConfig: Record<string, unknown>) => void;
};

export function WidgetConfigDialog({ isOpen, onClose, widgetType, config, onSave }: WidgetConfigDialogProps) {
  const [localConfig, setLocalConfig] = React.useState<Record<string, unknown>>(config);

  React.useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalConfig(config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only sync when opening

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  if (!widgetType) return null;

  // The grid only ever opens this dialog for configurable widgets, but guard
  // anyway so we never show an empty "nothing to configure" modal.
  const isConfigurable = WIDGET_CONFIGURABLE[widgetType] === true;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Configure Widget">
      <div className="space-y-4">
        {widgetType === "recent-operations" && (
          <div className="space-y-2">
            <Label>Row Count</Label>
            <Input
              type="number"
              min={3}
              max={15}
              value={String(localConfig.limit ?? "6")}
              onChange={e => setLocalConfig({ ...localConfig, limit: Number(e.target.value) })}
            />

            <Label className="mt-4 block">Filter</Label>
            <select
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(localConfig.filter ?? "ALL")}
              onChange={e => setLocalConfig({ ...localConfig, filter: e.target.value })}
            >
              <option value="ALL">All Trades</option>
              <option value="WINS">Winning Trades Only</option>
              <option value="LOSSES">Losing Trades Only</option>
            </select>
          </div>
        )}

        {widgetType === "agent-feed" && (
          <div className="space-y-2">
            <Label>Events Shown</Label>
            <Input
              type="number"
              min={5}
              max={30}
              value={String(localConfig.limit ?? "10")}
              onChange={e => setLocalConfig({ ...localConfig, limit: Number(e.target.value) })}
            />
            <p className="text-xs text-fg-subtle">How many of the most recent feed entries to keep on screen.</p>
          </div>
        )}

        {widgetType === "network-latency" && (
          <div className="space-y-2">
            <Label>Polling Interval</Label>
            <select
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(localConfig.interval ?? "1s")}
              onChange={e => setLocalConfig({ ...localConfig, interval: e.target.value })}
            >
              <option value="500ms">500ms (Fast)</option>
              <option value="1s">1 Second (Normal)</option>
              <option value="5s">5 Seconds (Slow)</option>
            </select>
          </div>
        )}

        {(widgetType === "streak-heatmap" || widgetType === "drawdown") && (
          <div className="space-y-2">
            <Label>Timeframe (Days)</Label>
            <select
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(localConfig.timeframe ?? "90")}
              onChange={e => setLocalConfig({ ...localConfig, timeframe: e.target.value })}
            >
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 180 Days</option>
            </select>
          </div>
        )}

        {widgetType === "live-tape" && (
          <div className="space-y-2">
            <Label>Rows</Label>
            <Input
              type="number"
              min={3}
              max={15}
              value={String(localConfig.rows ?? "6")}
              onChange={e => setLocalConfig({ ...localConfig, rows: Number(e.target.value) })}
            />
            <p className="text-xs text-fg-subtle">Number of executions to show in the tape.</p>
          </div>
        )}

        {widgetType === "asset-pnl" && (
          <div className="space-y-2">
            <Label>Breakdown</Label>
            <select
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(localConfig.mode ?? "asset")}
              onChange={e => setLocalConfig({ ...localConfig, mode: e.target.value })}
            >
              <option value="asset">By Asset (Instrument)</option>
              <option value="day">By Day (Last 14)</option>
            </select>
          </div>
        )}

        {widgetType === "risk-matrix" && (
          <div className="space-y-2">
            <Label>Group By</Label>
            <select
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(localConfig.groupBy ?? "asset")}
              onChange={e => setLocalConfig({ ...localConfig, groupBy: e.target.value })}
            >
              <option value="asset">Asset (Instrument)</option>
              <option value="direction">Direction (Long / Short)</option>
            </select>
          </div>
        )}

        {widgetType === "performance-summary" && (
          <div className="space-y-2">
            <Label>Window</Label>
            <select
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(localConfig.window ?? "all")}
              onChange={e => setLocalConfig({ ...localConfig, window: e.target.value })}
            >
              <option value="all">All trades</option>
              <option value="30">Last 30 trades</option>
              <option value="7">Last 7 trades</option>
            </select>
            <p className="text-xs text-fg-subtle">Which closed trades to summarise.</p>
          </div>
        )}

        {widgetType === "rolling-win-rate" && (
          <div className="space-y-2">
            <Label>Window</Label>
            <select
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(localConfig.window ?? "10")}
              onChange={e => setLocalConfig({ ...localConfig, window: e.target.value })}
            >
              <option value="10">Trailing 10 trades</option>
              <option value="20">Trailing 20 trades</option>
              <option value="30">Trailing 30 trades</option>
            </select>
            <p className="text-xs text-fg-subtle">How many trades each rolling win-rate point averages.</p>
          </div>
        )}

        {!isConfigurable && (
          <div className="p-4 border border-line rounded-[var(--radius-control)] bg-surface text-sm text-fg-subtle text-center">
            No configurable options available for this widget yet.
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-line">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Dialog>
  );
}
