import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type WidgetConfigDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  widgetType: string | null;
  config: Record<string, any>;
  onSave: (newConfig: Record<string, any>) => void;
};

export function WidgetConfigDialog({ isOpen, onClose, widgetType, config, onSave }: WidgetConfigDialogProps) {
  const [localConfig, setLocalConfig] = React.useState<Record<string, any>>(config);

  React.useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  if (!widgetType) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Configure Widget`}>
      <div className="space-y-4">
        {widgetType === "equity-hero" && (
          <div className="space-y-2">
            <Label>Timeframe</Label>
            <select 
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={localConfig.timeframe || "1M"}
              onChange={e => setLocalConfig({ ...localConfig, timeframe: e.target.value })}
            >
              <option value="1W">1 Week</option>
              <option value="1M">1 Month</option>
              <option value="3M">3 Months</option>
              <option value="ALL">All Time</option>
            </select>
          </div>
        )}

        {widgetType === "recent-operations" && (
          <div className="space-y-2">
            <Label>Row Count</Label>
            <Input 
              type="number" 
              min={3} 
              max={15} 
              value={localConfig.limit || 6}
              onChange={e => setLocalConfig({ ...localConfig, limit: Number(e.target.value) })}
            />
            
            <Label className="mt-4 block">Filter</Label>
            <select 
              className="flex h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
              value={localConfig.filter || "ALL"}
              onChange={e => setLocalConfig({ ...localConfig, filter: e.target.value })}
            >
              <option value="ALL">All Trades</option>
              <option value="WINS">Winning Trades Only</option>
              <option value="LOSSES">Losing Trades Only</option>
            </select>
          </div>
        )}

        {/* Generic fallback for widgets with no specific config yet */}
        {!["equity-hero", "recent-operations"].includes(widgetType) && (
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
