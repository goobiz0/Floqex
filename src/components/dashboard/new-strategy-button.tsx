"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStrategy } from "@/app/dashboard/strategy/actions";

/**
 * "New Strategy" entry point on the hub. Opens a small dialog to name a blank
 * strategy, creates it server-side with safe defaults, then deep-links into the
 * tuning view for the freshly created strategy.
 */
export function NewStrategyButton() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give your strategy a name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createStrategy(trimmed);
      if (!res.ok || !res.id) {
        setError(res.error ?? "Could not create the strategy.");
        return;
      }
      setOpen(false);
      setName("");
      router.push(`/dashboard/strategy?view=edit&strategyId=${res.id}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName("");
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 px-4 py-2 bg-fg rounded-[var(--radius-pill)] text-sm font-bold text-base hover:bg-fg/90 transition-all hover:-translate-y-[1px] active:scale-[0.97]"
      >
        <Plus size={16} weight="bold" />
        New Strategy
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => !pending && setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal
              aria-label="Create a new strategy"
              className="fixed left-1/2 top-1/2 z-50 w-[min(92%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-line bg-elevated p-6 shadow-[var(--shadow-xl)]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-fg">New strategy</h2>
                  <p className="mt-1 text-sm text-fg-subtle">
                    Starts from safe ORB defaults. Tune the parameters next.
                  </p>
                </div>
                <button
                  onClick={() => !pending && setOpen(false)}
                  className="text-fg-subtle transition-colors hover:text-fg"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 space-y-1.5">
                <Label htmlFor="new-strategy-name">Strategy name</Label>
                <Input
                  id="new-strategy-name"
                  autoFocus
                  value={name}
                  maxLength={60}
                  placeholder="e.g. NQ Opening Range"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  invalid={Boolean(error)}
                />
                {error && (
                  <p className="text-xs text-negative" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submit} disabled={pending}>
                  {pending ? "Creating…" : "Create strategy"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
