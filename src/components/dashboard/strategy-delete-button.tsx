"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash, Warning } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { deleteStrategy } from "@/app/dashboard/strategy/actions";

export function StrategyDeleteButton({
  strategyId,
  strategyName,
  hasBots,
}: {
  strategyId: string;
  strategyName: string;
  hasBots: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag for hydration-safe portal
    setMounted(true);
  }, []);

  function handleDelete() {
    setOpen(false);
    
    // Optimistically hide the card instantly to eliminate perceived delay
    const el = document.getElementById(`strategy-card-${strategyId}`);
    if (el) el.style.display = 'none';

    startTransition(async () => {
      await deleteStrategy(strategyId);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-[var(--radius-control)] text-fg-subtle hover:text-negative hover:bg-negative/10 transition-colors"
        aria-label="Delete strategy"
      >
        <Trash size={16} weight="duotone" />
      </button>

      <AnimatePresence>
        {open && mounted && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-base/80 backdrop-blur-sm"
              onClick={() => !isPending && setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-xl)] mx-4"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-10 w-10 rounded-full bg-negative/10 border border-negative/20 flex items-center justify-center text-negative">
                    <Warning size={20} weight="fill" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-fg">Delete strategy?</h2>
                    <p className="text-sm text-fg-subtle mt-1">
                      <span className="font-medium text-fg">{strategyName}</span> will be permanently removed.
                      {hasBots
                        ? " Any accounts using this strategy will be detached and stop trading."
                        : " This action cannot be undone."}
                    </p>
                  </div>
                </div>

                {hasBots && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-control)] bg-warning/10 border border-warning/20 text-warning text-xs font-medium">
                    <Warning size={14} weight="fill" />
                    Assigned accounts will lose their active bot.
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-[var(--radius-control)] bg-surface hover:bg-surface-hover border border-line transition-colors text-fg disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-[var(--radius-control)] bg-negative/15 hover:bg-negative/25 border border-negative/30 text-negative transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <span className="h-4 w-4 rounded-full border-2 border-negative/30 border-t-negative animate-spin" />
                    ) : (
                      <Trash size={15} weight="duotone" />
                    )}
                    {isPending ? "Deleting..." : "Delete strategy"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}
