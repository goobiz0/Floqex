"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Warning, X, EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Stage = "confirm" | "verify";

/** Mask an email like jane.doe@acme.com -> j••••e@acme.com for the prompt. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 1);
  const tail = local.length > 1 ? local.slice(-1) : "";
  return `${head}${"•".repeat(Math.max(2, local.length - 2))}${tail}@${domain}`;
}

/**
 * A real confirmation flow for irreversible actions. The user must type the
 * confirmation word AND enter a one-time code emailed to their account (a
 * lightweight 2FA gate) before the destructive server action runs.
 */
export function DangerActionDialog({
  triggerLabel,
  title,
  description,
  consequence,
  actionLabel,
  verifyWord,
  run,
  onSuccess,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  consequence: string;
  actionLabel: string;
  verifyWord: string;
  run: () => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}) {
  const { user } = useUser();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("confirm");
  const [typed, setTyped] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal needs a client mount before document.body exists
    setMounted(true);
  }, []);

  const emailObj = user?.primaryEmailAddress ?? null;
  const cooldown = useRef<number>(0);

  function reset() {
    setStage("confirm");
    setTyped("");
    setCode("");
    setError(null);
    setSending(false);
    setSentTo(null);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    // Defer reset so the exit animation isn't interrupted mid-frame.
    setTimeout(reset, 200);
  }

  async function sendCode() {
    if (!emailObj) {
      setError("No email on file to send a verification code to.");
      return;
    }
    const now = Date.now();
    if (now < cooldown.current) return;
    cooldown.current = now + 20_000;
    setSending(true);
    setError(null);
    try {
      await emailObj.prepareVerification({ strategy: "email_code" });
      setSentTo(maskEmail(emailObj.emailAddress));
      setStage("verify");
    } catch {
      setError("Could not send the verification code. Please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  function confirmAndRun() {
    if (!emailObj) return;
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await emailObj.attemptVerification({ code: code.trim() });
      } catch {
        setError("That code is incorrect or expired. Request a new one.");
        return;
      }
      const res = await run();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong. Please try again.");
        return;
      }
      onSuccess?.();
    });
  }

  const dialog = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className="fixed left-1/2 top-1/2 z-[61] w-[min(94%,440px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-xl)]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line bg-negative/5 px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-negative-soft text-negative">
                  <Warning size={18} weight="fill" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-fg">{title}</h2>
                  <p className="mt-0.5 text-xs text-fg-subtle">{description}</p>
                </div>
              </div>
              <button onClick={close} aria-label="Close" className="text-fg-subtle transition-colors hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {stage === "confirm" ? (
                <>
                  <div className="rounded-[var(--radius-control)] border border-negative/30 bg-negative/5 p-3 text-sm text-fg-muted">
                    {consequence}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="danger-confirm-word">
                      Type <span className="font-mono font-semibold text-fg">{verifyWord}</span> to continue
                    </Label>
                    <Input
                      id="danger-confirm-word"
                      autoFocus
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      placeholder={verifyWord}
                      aria-label={`Type ${verifyWord} to confirm`}
                    />
                  </div>
                  {error && <p className="text-xs text-negative" role="alert">{error}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={close} disabled={sending}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={sendCode}
                      disabled={typed !== verifyWord || sending || !emailObj}
                    >
                      <EnvelopeSimple size={15} weight="bold" />
                      {sending ? "Sending code…" : "Email me a code"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 rounded-[var(--radius-control)] border border-line bg-surface/60 p-3 text-sm text-fg-muted">
                    <ShieldCheck size={18} weight="fill" className="shrink-0 text-accent" />
                    <span>We sent a 6-digit code to <span className="font-medium text-fg">{sentTo}</span>. Enter it to confirm.</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="danger-confirm-code">Verification code</Label>
                    <Input
                      id="danger-confirm-code"
                      autoFocus
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="tnum tracking-[0.3em]"
                      aria-label="6-digit verification code"
                    />
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={sending}
                      className="text-xs font-medium text-accent transition-colors hover:text-accent-hover disabled:opacity-50"
                    >
                      {sending ? "Resending…" : "Resend code"}
                    </button>
                  </div>
                  {error && <p className="text-xs text-negative" role="alert">{error}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={close} disabled={pending}>
                      Cancel
                    </Button>
                    <button
                      type="button"
                      onClick={confirmAndRun}
                      disabled={pending || code.trim().length < 6}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-negative px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-negative/90 active:scale-[0.97] disabled:opacity-50"
                    >
                      {pending ? "Working…" : actionLabel}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-base/40 px-4 py-3">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="text-xs text-fg-subtle">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => { reset(); setOpen(true); }}
          className="shrink-0 rounded-[var(--radius-control)] border border-negative/50 px-3 py-1.5 text-sm font-medium text-negative transition-colors hover:bg-negative-soft active:scale-[0.97]"
        >
          {triggerLabel}
        </button>
      </div>
      {mounted && createPortal(dialog, document.body)}
    </div>
  );
}
