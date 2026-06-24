"use client";

import React, { useState, useEffect } from "react";
import { Responsive, Layout } from "react-grid-layout";
const WidthProvider = require("react-grid-layout").WidthProvider;
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Plus, Gear, X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

const ResponsiveGridLayout = WidthProvider(Responsive);

export type WidgetItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  config: Record<string, any>;
};

type WidgetGridProps = {
  items: WidgetItem[];
  isEditMode: boolean;
  onLayoutChange: (layout: Layout[]) => void;
  onRemoveWidget: (id: string) => void;
  onConfigureWidget: (id: string) => void;
  onAddWidgetRequest: () => void;
  renderWidget: (item: WidgetItem) => React.ReactNode;
};

// Map widget types to allowed dimensions (for the presets requirement)
export const WIDGET_DIMENSIONS: Record<string, { minW: number; minH: number; maxW: number; maxH: number }> = {
  "equity-hero": { minW: 6, minH: 3, maxW: 12, maxH: 6 },
  "agent-feed": { minW: 3, minH: 3, maxW: 6, maxH: 6 },
  "risk-heatmap": { minW: 3, minH: 3, maxW: 6, maxH: 6 },
  "win-rate": { minW: 2, minH: 3, maxW: 4, maxH: 4 },
  "recent-operations": { minW: 4, minH: 4, maxW: 12, maxH: 8 },
  "asset-pnl": { minW: 4, minH: 4, maxW: 8, maxH: 8 },
  "system-health": { minW: 2, minH: 3, maxW: 4, maxH: 4 },
  "market-pulse": { minW: 2, minH: 3, maxW: 4, maxH: 4 },
  "quick-actions": { minW: 3, minH: 3, maxW: 4, maxH: 4 },
  "custom-graph": { minW: 4, minH: 3, maxW: 12, maxH: 6 },
};

export function WidgetGrid({ 
  items, 
  isEditMode, 
  onLayoutChange, 
  onRemoveWidget, 
  onConfigureWidget,
  onAddWidgetRequest,
  renderWidget 
}: WidgetGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[500px] w-full animate-pulse bg-surface/30 rounded-[var(--radius-card)]" />;
  }

  // Convert our items to RGL Layout format, ensuring dimension constraints
  const layout = items.map(item => {
    const constraints = WIDGET_DIMENSIONS[item.type] || { minW: 2, minH: 2, maxW: 12, maxH: 12 };
    return {
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: constraints.minW,
      minH: constraints.minH,
      maxW: constraints.maxW,
      maxH: constraints.maxH,
      isDraggable: isEditMode,
      isResizable: isEditMode,
    };
  });

  return (
    <div className={cn("relative min-h-[400px]", isEditMode && "p-2 bg-surface/10 rounded-lg border border-line border-dashed")}>
      
      {items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          <div className="w-full h-full max-w-2xl max-h-64 border-2 border-dashed border-line rounded-[var(--radius-card)] bg-surface/30 flex flex-col items-center justify-center transition-colors hover:border-accent-soft hover:bg-surface group">
            {isEditMode ? (
              <button 
                onClick={onAddWidgetRequest}
                className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-[var(--radius-pill)] hover:bg-accent hover:text-[var(--color-on-accent)] transition-colors font-medium text-sm"
              >
                <Plus size={16} weight="bold" />
                Add your first widget
              </button>
            ) : (
              <p className="text-fg-subtle text-sm">Your dashboard is empty. Enter edit mode to customize it.</p>
            )}
          </div>
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout, md: layout, sm: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        onLayoutChange={(currentLayout: Layout[]) => onLayoutChange(currentLayout)}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        margin={[16, 16]}
        useCSSTransforms={true}
        draggableHandle=".drag-handle"
      >
        {items.map(item => (
          <div key={item.i} className={cn(
            "relative group rounded-[var(--radius-card)] bg-elevated border border-line overflow-hidden flex flex-col",
            isEditMode && "ring-1 ring-transparent hover:ring-accent/50 transition-shadow",
            isEditMode && "cursor-move drag-handle"
          )}>
            <div className="flex-1 overflow-hidden pointer-events-auto">
              {renderWidget(item)}
            </div>

            {/* Edit Mode Overlays */}
            <AnimatePresence>
              {isEditMode && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none rounded-[var(--radius-card)] border-2 border-transparent group-hover:border-accent-soft/50 transition-colors"
                >
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onConfigureWidget(item.i); }}
                      className="p-1.5 bg-surface border border-line rounded-md text-fg-subtle hover:text-accent hover:border-accent-soft transition-colors shadow-sm"
                    >
                      <Gear size={14} weight="bold" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveWidget(item.i); }}
                      className="p-1.5 bg-surface border border-line rounded-md text-fg-subtle hover:text-negative hover:border-negative-soft transition-colors shadow-sm"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
