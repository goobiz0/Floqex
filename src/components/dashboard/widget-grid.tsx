"use client";

import React, { useState, useEffect } from "react";
import { Responsive, Layout, Layouts, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Plus, Gear, X, Info } from "@phosphor-icons/react/dist/ssr";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Which widgets expose real, working settings. The gear/settings button is only
// shown for these — every other widget hides it instead of opening a dialog
// that says "nothing to configure".
export const WIDGET_CONFIGURABLE: Record<string, boolean> = {
  "recent-operations": true,
  "agent-feed": true,
};

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };
const BASE_COLS = 12;

function constraintsFor(type: string) {
  return WIDGET_DIMENSIONS[type] || { minW: 2, minH: 2, maxW: 12, maxH: 12 };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// The authored 12-column layout, used as-is on desktop (lg/md).
function desktopLayout(items: WidgetItem[], editable: boolean): Layout[] {
  return items.map((item) => {
    const c = constraintsFor(item.type);
    return {
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: c.minW,
      minH: c.minH,
      maxW: c.maxW,
      maxH: c.maxH,
      isDraggable: editable,
      isResizable: editable,
    };
  });
}

// Reflow the authored 12-column layout into a narrower grid by scaling each
// widget's width proportionally and packing widgets left-to-right, top-to-bottom
// in reading order. This preserves the dashboard's structure (halves stay
// halves, full-width stays full-width) instead of dumping everything into one
// column, so it looks intentional at every width. Non-overlapping x/y are
// emitted; react-grid-layout compacts the result vertically.
function reflowLayout(items: WidgetItem[], cols: number): Layout[] {
  const ordered = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  let x = 0;
  let y = 0;
  let rowHeight = 0;

  return ordered.map((item) => {
    const c = constraintsFor(item.type);
    const minW = Math.min(c.minW, cols);
    let w = Math.round((item.w * cols) / BASE_COLS);
    w = clamp(w, minW, cols);
    const h = clamp(item.h, c.minH, c.maxH);

    // Wrap to a new row when the widget doesn't fit in the remaining columns.
    if (x + w > cols) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }

    const lay: Layout = {
      i: item.i,
      x,
      y,
      w,
      h,
      minW,
      minH: c.minH,
      maxW: cols,
      maxH: c.maxH,
      // Rearranging only happens on desktop, where the canonical layout lives.
      isDraggable: false,
      isResizable: false,
    };

    x += w;
    rowHeight = Math.max(rowHeight, h);
    return lay;
  });
}

function buildLayouts(items: WidgetItem[], editable: boolean): Layouts {
  return {
    lg: desktopLayout(items, editable),
    md: desktopLayout(items, editable),
    sm: reflowLayout(items, COLS.sm),
    xs: reflowLayout(items, COLS.xs),
    xxs: reflowLayout(items, COLS.xxs),
  };
}

export function WidgetGrid({
  items,
  isEditMode,
  onLayoutChange,
  onRemoveWidget,
  onConfigureWidget,
  onAddWidgetRequest,
  renderWidget,
}: WidgetGridProps) {
  const [mounted, setMounted] = useState(false);
  const [breakpoint, setBreakpoint] = useState<string>("lg");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[500px] w-full animate-pulse bg-surface/30 rounded-[var(--radius-card)]" />;
  }

  const layouts = buildLayouts(items, isEditMode);
  const isDesktop = breakpoint === "lg" || breakpoint === "md";

  return (
    <div className={cn("relative min-h-[400px] w-full", isEditMode && "p-2 bg-surface/10 rounded-lg border border-line border-dashed")}>

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

      {isEditMode && !isDesktop && (
        <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface/60 px-3 py-2 text-xs text-fg-subtle">
          <Info size={14} weight="bold" className="shrink-0 text-accent" />
          Widgets stack into one column on narrow screens. Switch to a wider screen to rearrange your layout.
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={60}
        onBreakpointChange={(bp: string) => setBreakpoint(bp)}
        onLayoutChange={(currentLayout: Layout[]) => {
          // Only persist edits made on desktop, where the canonical 12-column
          // layout is authored. `lg` and `md` are both 12 columns, so the active
          // layout maps straight back to the saved template. Reflowed
          // mobile/tablet layouts are display-only single-column stacks, so their
          // coordinates are never written back.
          if (!isEditMode) return;
          if (breakpoint === "lg" || breakpoint === "md") onLayoutChange(currentLayout);
        }}
        isDraggable={isEditMode && isDesktop}
        isResizable={isEditMode && isDesktop}
        margin={[16, 16]}
        useCSSTransforms={true}
        draggableHandle=".drag-handle"
      >
        {items.map((item) => {
          const canConfigure = WIDGET_CONFIGURABLE[item.type] === true;
          return (
            <div key={item.i} className={cn(
              "relative group rounded-[var(--radius-card)] bg-elevated border border-line overflow-hidden flex flex-col",
              isEditMode && isDesktop && "ring-1 ring-transparent hover:ring-accent/50 transition-shadow cursor-move drag-handle"
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
                      {canConfigure && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onConfigureWidget(item.i); }}
                          className="p-1.5 bg-surface border border-line rounded-md text-fg-subtle hover:text-accent hover:border-accent-soft transition-colors shadow-sm"
                          aria-label="Configure widget"
                          title="Configure widget"
                        >
                          <Gear size={14} weight="bold" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveWidget(item.i); }}
                        className="p-1.5 bg-surface border border-line rounded-md text-fg-subtle hover:text-negative hover:border-negative-soft transition-colors shadow-sm"
                        aria-label="Remove widget"
                        title="Remove widget"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
