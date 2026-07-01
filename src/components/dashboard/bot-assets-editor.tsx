"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { PencilSimple, X, ChartBar } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AssetMultiSelect, AssetIcon } from "@/components/dashboard/asset-multi-select";
import { getAsset } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { updateBotInstruments } from "@/app/dashboard/bots/actions";

const QUICK_SYMBOLS = ["NQ", "ES", "AAPL", "NVDA", "BTC", "SPY"];

/**
 * Read-and-edit view of the assets a single bot trades. Assets are a property of
 * the bot (not the strategy), so this is where a user re-points a bot at a
 * different market — or adds several — without cloning the strategy.
 */
export function BotAssetsEditor({ botId, instruments }: { botId: string; instruments: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<string[]>(instruments);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag for hydration-safe portal
    setMounted(true);
  }, []);

  function launch() {
    setDraft(instruments);
    setError(null);
    setOpen(true);
  }

  function save() {
    if (draft.length === 0) {
      setError("Choose at least one asset for the bot to trade.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateBotInstruments(botId, draft);
      if (res.ok) {
        toast.success("Assets updated. The bot applies them on its next check.");
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not update the bot's assets.");
      }
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
          <ChartBar size={13} weight="duotone" />
          Assets traded
        </p>
        <button
          type="button"
          onClick={launch}
          className="inline-flex items-center gap-1 rounded-[var(--radius-control)] px-1.5 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          <PencilSimple size={12} weight="bold" /> Edit
        </button>
      </div>
      {instruments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {instruments.map((sym) => {
            const kind = getAsset(sym)?.kind ?? "STOCK";
            return (
              <span
                key={sym}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface py-0.5 pl-1 pr-2 text-xs font-semibold tnum text-fg"
              >
                <AssetIcon kind={kind} size={12} />
                {sym}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-fg-subtle italic">No assets set. Click Edit to choose what this bot trades.</p>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-base/80 backdrop-blur-sm"
                  onClick={() => !pending && setOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="relative z-10 mx-4 w-full max-w-lg overflow-visible rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-xl)]"
                >
                  <div className="flex items-start justify-between border-b border-line p-5">
                    <div>
                      <h2 className="text-base font-semibold text-fg">Edit traded assets</h2>
                      <p className="mt-1 text-sm text-fg-subtle">
                        Choose which markets this bot trades. Each asset is managed independently under your risk limits.
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

                  <div className="p-5">
                    <AssetMultiSelect value={draft} onChange={setDraft} />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-fg-subtle">Quick add:</span>
                      {QUICK_SYMBOLS.map((s) => {
                        const active = draft.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setDraft((cur) => (active ? cur.filter((x) => x !== s) : [...cur, s]))}
                            className={
                              "rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-medium transition-colors " +
                              (active
                                ? "border-accent/40 bg-accent-soft text-accent"
                                : "border-line bg-surface text-fg-subtle hover:bg-surface-hover hover:text-fg")
                            }
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    {error && <p className="mt-3 text-sm text-negative">{error}</p>}
                  </div>

                  <div className="flex justify-end gap-2 border-t border-line p-5">
                    <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={save} disabled={pending}>
                      {pending ? "Saving…" : "Save assets"}
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
