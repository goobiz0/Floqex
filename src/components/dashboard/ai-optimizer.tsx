"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Sparkle, MagicWand, Star, Lock, Check, X, Robot, ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { hasAiAnalysis, PLANS, AI_ANALYSIS_MIN_PLAN, type Plan } from "@/lib/plans";
import { displayParamValue } from "@/lib/strategy-schema";
import { runAiOptimization, approveSuggestion, rejectSuggestion, type AiAnalysisAdjustment } from "@/app/dashboard/strategy/actions";

const EASE = [0.23, 1, 0.32, 1] as const;

function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
      <Star size={10} weight="fill" /> Pro
    </span>
  );
}

/**
 * AI Strategy Analysis — a Pro-tier, Mochi-powered reading of this bot's real
 * trades that proposes ONE conservative parameter change. Non-Pro plans see a
 * locked upgrade card; Pro plans get the live tool. The proposal is reviewed
 * inline (approve applies it within the same safe bounds as a manual save).
 */
export function AIOptimizer({ activeAccountId, plan }: { activeAccountId: string; plan: Plan }) {
  const entitled = hasAiAnalysis(plan);
  const reduce = useReducedMotion();
  const router = useRouter();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AiAnalysisAdjustment | null>(null);
  const [applied, setApplied] = useState<"approved" | "rejected" | null>(null);
  const [isDeciding, startDecide] = useTransition();

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError(null);
    setNote(null);
    setShowUpgrade(false);
    setApplied(null);
    setProposal(null);
    try {
      const res = await runAiOptimization(activeAccountId);
      if (!res.ok) {
        setError(res.error || "Failed to run analysis.");
        setShowUpgrade(Boolean(res.upgrade));
        return;
      }
      if (res.adjustment) {
        setProposal(res.adjustment);
      } else {
        setNote(res.note);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const decide = (approve: boolean) => {
    if (!proposal) return;
    setError(null);
    startDecide(async () => {
      const res = approve ? await approveSuggestion(proposal.id) : await rejectSuggestion(proposal.id);
      if (!res.ok) {
        setError(res.error ?? "Could not update the suggestion.");
        return;
      }
      setApplied(approve ? "approved" : "rejected");
      setProposal(null);
      // Sync the strategy params + change log server-side.
      router.refresh();
    });
  };

  // ── Locked state: not entitled (Free / Trader) ──────────────────────────────
  if (!entitled) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                  <Sparkle size={14} weight="fill" />
                </span>
                AI Strategy Analysis
              </h3>
              <ProBadge />
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-subtle">
              Let Mochi read this bot&apos;s real trades and past performance, then propose one
              careful, evidence-backed tweak to improve your edge. Available on the{" "}
              {PLANS[AI_ANALYSIS_MIN_PLAN].name} plan and up.
            </p>
          </div>
          <Button
            href="/dashboard/billing"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent"
          >
            <Lock size={14} weight="fill" />
            Upgrade to {PLANS[AI_ANALYSIS_MIN_PLAN].name}
          </Button>
        </div>
      </div>
    );
  }

  // ── Active state: entitled (Pro / Elite) ────────────────────────────────────
  return (
    <div className="rounded-[var(--radius-card)] border border-accent/20 bg-accent/5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-accent">
              <Sparkle size={16} weight="fill" />
              AI Strategy Analysis
            </h3>
            <ProBadge />
          </div>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-fg-subtle">
            Mochi analyses this bot&apos;s recent trades and current settings, then proposes one
            conservative parameter change to improve your Win Rate or R-multiple. You approve
            before anything is applied.
          </p>
        </div>
        <Button
          onClick={handleOptimize}
          disabled={isOptimizing || isDeciding}
          className="shrink-0 gap-2 bg-accent text-on-accent hover:bg-accent-hover shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.35)]"
        >
          <MagicWand size={16} weight="fill" />
          {isOptimizing ? "Analysing..." : "Run AI Analysis"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-[var(--radius-control)] border border-negative/30 bg-negative-soft px-3 py-2.5">
          <p className="text-xs text-negative">{error}</p>
          {showUpgrade && (
            <Link
              href="/dashboard/billing"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <Star size={12} weight="fill" /> View plans
            </Link>
          )}
        </div>
      )}

      {/* Reviewed, no change worth making */}
      {note && (
        <div className="mt-4 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
          {note}
        </div>
      )}

      {/* Applied / dismissed confirmation */}
      {applied && (
        <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-xs text-fg-muted">
          {applied === "approved" ? (
            <>
              <Check size={14} weight="bold" className="text-profit" />
              Applied. Your bot uses the new setting on its next check. It&apos;s recorded in the change log below.
            </>
          ) : (
            <>
              <X size={14} weight="bold" className="text-fg-subtle" />
              Suggestion dismissed. Nothing was changed.
            </>
          )}
        </div>
      )}

      {/* Proposed adjustment */}
      <AnimatePresence>
        {proposal && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: EASE }}
            className="mt-4 rounded-[var(--radius-control)] border border-accent/30 bg-base/60 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-fg">Proposed adjustment</p>
              <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                Needs your approval
              </span>
            </div>

            <p className="mt-2 font-mono text-xs">
              <span className="text-fg-muted">{proposal.parameter}</span>{" "}
              <span className="text-negative line-through">{displayParamValue(proposal.paramKey, proposal.oldValue)}</span>
              <span className="text-fg-subtle"> to </span>
              <span className="text-positive">{displayParamValue(proposal.paramKey, proposal.newValue)}</span>
            </p>

            {proposal.reasoning && (
              <p className="mt-2 text-xs leading-relaxed text-fg-subtle">{proposal.reasoning}</p>
            )}

            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ["Sample", proposal.sampleSize != null ? String(proposal.sampleSize) : "—"],
                ["Win delta", proposal.winRateDelta != null ? `${proposal.winRateDelta > 0 ? "+" : ""}${proposal.winRateDelta}%` : "—"],
                ["Confidence", proposal.confidence != null ? `${proposal.confidence}%` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[8px] bg-surface py-1.5">
                  <dt className="text-[0.65rem] text-fg-subtle">{k}</dt>
                  <dd className="tnum text-xs font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1" disabled={isDeciding} onClick={() => decide(true)}>
                <Check size={15} weight="bold" />
                {isDeciding ? "Applying..." : "Approve & apply"}
              </Button>
              <Button size="sm" variant="secondary" className="flex-1" disabled={isDeciding} onClick={() => decide(false)}>
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mochi link + usage note */}
      <div className="mt-4 flex items-center gap-1.5 border-t border-line/60 pt-3 text-[11px] text-fg-faint">
        <Robot size={13} weight="fill" className="text-accent/70" />
        <span>Powered by Mochi. Draws from your shared AI token budget.</span>
        <Link href="/dashboard/usage" className="ml-auto inline-flex items-center gap-1 font-medium text-fg-subtle hover:text-fg">
          View usage <ArrowSquareOut size={11} />
        </Link>
      </div>
    </div>
  );
}
