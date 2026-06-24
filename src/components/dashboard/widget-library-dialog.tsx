import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WidgetItem, WIDGET_DIMENSIONS } from "./widget-grid";
import { Plus } from "@phosphor-icons/react/dist/ssr";

const AVAILABLE_WIDGETS = [
  { type: "equity-hero", name: "Balance & Equity", desc: "Hero view of active capital and daily PnL." },
  { type: "agent-feed", name: "Live Execution Feed", desc: "Real-time feed of bot actions and alerts." },
  { type: "risk-heatmap", name: "Risk Heatmap", desc: "Visual grid of daily drawdown status." },
  { type: "win-rate", name: "Win Rate Gauge", desc: "Circular gauge of recent operation success." },
  { type: "recent-operations", name: "Recent Operations", desc: "List of the most recent closed trades." },
  { type: "asset-pnl", name: "Asset PnL Breakdown", desc: "Bar chart of net PnL by instrument." },
  { type: "system-health", name: "Engine Health", desc: "Core latency and bot connection status." },
  { type: "market-pulse", name: "Market Pulse", desc: "Countdown to next major session open." },
  { type: "quick-actions", name: "Quick Actions", desc: "Shortcut buttons for new bot, broker, etc." },
];

export function WidgetLibraryDialog({ isOpen, onClose, onAdd }: { isOpen: boolean, onClose: () => void, onAdd: (type: string) => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Widget Library">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
        {AVAILABLE_WIDGETS.map(w => {
          const dim = WIDGET_DIMENSIONS[w.type] || { minW: 2, minH: 2 };
          return (
            <div key={w.type} className="flex flex-col border border-line rounded-[var(--radius-card)] bg-surface p-4 hover:border-accent-soft transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-fg">{w.name}</h4>
                <button 
                  onClick={() => { onAdd(w.type); onClose(); }}
                  className="bg-accent/10 text-accent p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Plus size={16} weight="bold" />
                </button>
              </div>
              <p className="text-xs text-fg-subtle mb-3">{w.desc}</p>
              <div className="mt-auto flex items-center gap-2">
                <span className="text-[10px] font-mono text-fg-faint bg-base px-1.5 py-0.5 rounded border border-line">
                  Min: {dim.minW}x{dim.minH}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
