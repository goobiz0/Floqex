"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Flask, Robot, MagicWand, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StrategyDeleteButton } from "./strategy-delete-button";
import { deleteStrategy } from "@/app/dashboard/strategy/actions";

export type HubStrategy = {
  id: string;
  name: string;
  kind: string;
  version: number;
  edgeScore: number | null;
  edgeVerdict: string | null;
  bots: { id: string; status: string; accountId: string | null; nickname: string }[];
};

function verdictTone(verdict: string | null): string {
  if (verdict === "Robust") return "bg-profit";
  if (verdict === "Promising") return "bg-warning";
  return "bg-negative";
}

function EdgeMeter({ score, verdict }: { score: number; verdict: string | null }) {
  const reduce = useReducedMotion();
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-fg-faint">Edge score</span>
        <span className="tnum text-[10px] font-semibold text-fg-subtle">{score}</span>
      </div>
      <div className="h-1 w-full rounded-[var(--radius-pill)] bg-surface overflow-hidden">
        <motion.div
          className={`h-full rounded-[var(--radius-pill)] ${verdictTone(verdict)}`}
          initial={{ width: reduce ? `${score}%` : "0%" }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
        />
      </div>
      {verdict && (
        <span className={`mt-1 text-[10px] font-semibold ${
          verdict === "Robust" ? "text-profit" : verdict === "Promising" ? "text-warning" : "text-negative"
        }`}>{verdict}</span>
      )}
    </div>
  );
}

export function StrategyHubGrid({ strategies }: { strategies: HubStrategy[] }) {
  // Optimistic deletion is tracked as a set of removed ids derived over the
  // server list, so a router.refresh that returns fresh data (new strategies,
  // updated edge scores) flows through without mirroring props into state.
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const reduce = useReducedMotion();

  const items = useMemo(
    () => strategies.filter((s) => !removedIds.has(s.id)),
    [strategies, removedIds],
  );

  function handleDelete(id: string) {
    // Optimistically hide the card immediately.
    setRemovedIds((prev) => new Set(prev).add(id));
    setPendingId(id);

    startTransition(async () => {
      const res = await deleteStrategy(id);
      if (res.ok) {
        toast.success("Strategy deleted.");
        router.refresh();
      } else {
        // Rollback: un-hide the card and surface the error.
        setRemovedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.error(res.error ?? "Could not delete the strategy.");
      }
      setPendingId(null);
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {items.map((s, i) => (
          <motion.div
            key={s.id}
            layout
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
            transition={reduce ? { duration: 0 } : { duration: 0.2, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="group transition-gpu lift relative flex flex-col p-6 rounded-[var(--radius-card)] bg-surface border border-line shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] h-full">
              <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-surface-hover border border-line flex items-center justify-center text-fg">
                    <Flask size={20} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-bold text-fg text-lg">{s.name}</h3>
                    <p className="text-xs text-fg-subtle uppercase tracking-widest">{s.kind} - v{s.version}</p>
                  </div>
                </div>
                <StrategyDeleteButton
                  strategyName={s.name}
                  hasBots={s.bots.length > 0}
                  pending={pendingId === s.id}
                  onConfirm={() => handleDelete(s.id)}
                />
              </div>

              {s.edgeScore !== null && (
                <div className="relative z-10">
                  <EdgeMeter score={s.edgeScore} verdict={s.edgeVerdict} />
                </div>
              )}

              <div className="relative z-10 flex-1 mt-2 mb-6">
                <h4 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Assigned To</h4>
                {s.bots.length > 0 ? (
                  <div className="space-y-2">
                    {s.bots.map((bot) => (
                      <div key={bot.id} className="flex items-center gap-2 text-sm text-fg bg-base/50 p-2 rounded-[var(--radius-control)] border border-line">
                        <Robot size={16} weight="duotone" className="text-fg-subtle shrink-0" />
                        <span className="font-medium truncate">{bot.nickname}</span>
                        <span className={`ml-auto text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-[var(--radius-pill)] uppercase shrink-0 ${bot.status === "RUNNING" ? "bg-profit/10 text-profit" : "bg-surface border border-line text-fg-subtle"}`}>
                          {bot.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-fg-subtle italic flex items-center gap-2 bg-base/50 p-2 rounded-[var(--radius-control)] border border-transparent">
                    <span className="h-1.5 w-1.5 rounded-full bg-fg-muted" /> No accounts assigned
                  </p>
                )}
              </div>

              <div className="relative z-10 mt-auto pt-4 border-t border-line/50">
                <Link
                  href={`/dashboard/strategy?view=edit${s.bots[0] ? `&account=${s.bots[0].accountId}` : `&strategyId=${s.id}`}`}
                  className="block w-full text-center py-2.5 text-sm font-semibold bg-surface-hover hover:bg-base rounded-[var(--radius-control)] transition-all hover:-translate-y-[1px] text-fg border border-transparent hover:border-line"
                >
                  Tune Parameters
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {items.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-line rounded-[var(--radius-card)] bg-surface/30">
          <div className="h-16 w-16 rounded-full bg-surface border border-line flex items-center justify-center text-fg-subtle mb-6">
            <Flask size={32} weight="duotone" />
          </div>
          <h3 className="text-lg font-bold text-fg mb-2">No strategies defined</h3>
          <p className="text-sm text-fg-subtle text-center max-w-md mb-6">
            You haven&apos;t created any trading algorithms yet. Start from a curated template, write your own logic, or let AI draft one for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link href="/dashboard/strategy?view=new" className="relative group inline-flex items-center gap-2 px-6 py-3 bg-accent border border-accent/50 rounded-[var(--radius-pill)] text-sm font-bold text-base transition-all hover:shadow-[0_0_30px_rgba(var(--color-accent-rgb),0.4)] hover:-translate-y-[1px]">
              <Plus size={18} weight="bold" className="text-base" />
              Create a strategy
            </Link>
            <Link href="/dashboard/strategy?view=builder" className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-line rounded-[var(--radius-pill)] text-sm font-semibold text-fg transition-all hover:border-line-strong hover:-translate-y-[1px]">
              <MagicWand size={18} weight="fill" className="text-accent" />
              Generate with AI
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
