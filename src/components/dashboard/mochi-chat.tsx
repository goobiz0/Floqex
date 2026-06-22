"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChatCircle, X, PaperPlaneRight, Robot, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "How am I doing so far?",
  "Is my bot running?",
  "Explain the ORB strategy",
  "Lower my risk to 0.5%",
];

function ThinkingDots() {
  return (
    <div className="flex items-center gap-3 rounded-[18px] rounded-bl-[6px] border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.3s]" />
      </div>
      <span className="text-xs font-medium text-fg-subtle">Thinking</span>
    </div>
  );
}

export function MochiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const reduce = useReducedMotion();
  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  const spring = { type: "spring" as const, damping: 26, stiffness: 280, mass: 0.6 };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            aria-label="Open Mochi assistant"
            initial={reduce ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? undefined : { scale: 0.9, opacity: 0 }}
            transition={spring}
            onClick={() => setIsOpen(true)}
            className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[var(--color-on-accent)] shadow-[0_10px_30px_-8px_var(--color-accent-ring)] transition-transform hover:scale-[1.04] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChatCircle size={26} weight="fill" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Mochi assistant"
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.15 } }}
            transition={spring}
            className="fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[calc(100dvh-3rem)] w-[380px] max-w-[calc(100vw-3rem)] origin-bottom-right flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-accent text-[var(--color-on-accent)]">
                  <Robot size={20} weight="fill" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-elevated bg-profit" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-fg">Mochi</h3>
                  <p className="text-xs text-fg-subtle">Your trading copilot</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-fg-subtle transition-colors hover:bg-surface hover:text-fg active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-accent-soft text-accent">
                    <Robot size={28} weight="fill" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-fg">How can I help?</p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-subtle">
                    Ask about your performance, the bot, or tune your strategy in plain English.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput(s)}
                        className="rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <motion.div
                      key={m.id}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className={cn("flex w-full gap-2", isUser ? "justify-end" : "justify-start")}
                    >
                      {!isUser && (
                        <div className="mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                          <Robot size={13} weight="fill" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[82%] rounded-[18px] px-3.5 py-2.5 text-[13px] leading-relaxed",
                          isUser
                            ? "rounded-br-[6px] bg-accent text-[var(--color-on-accent)]"
                            : "rounded-bl-[6px] border border-line bg-surface text-fg",
                        )}
                      >
                        {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                        {m.toolInvocations?.map((inv) => {
                          const done = inv.state === "result";
                          const labels: Record<string, [string, string]> = {
                            updateStrategyParams: ["Updating strategy", "Strategy updated"],
                            getPerformance: ["Reading performance", "Performance loaded"],
                            getBotStatus: ["Checking bot status", "Status loaded"],
                          };
                          const [running, finished] = labels[inv.toolName] ?? [
                            `Running ${inv.toolName}`,
                            `${inv.toolName} done`,
                          ];
                          return (
                            <div
                              key={inv.toolCallId}
                              className={cn(
                                "mt-2 flex items-center gap-2 rounded-[var(--radius-control)] border px-2.5 py-1.5 text-xs font-medium",
                                done
                                  ? "border-line bg-base/50 text-fg-muted"
                                  : "border-accent/30 bg-accent-soft text-accent",
                              )}
                            >
                              {done ? (
                                <Check size={13} weight="bold" className="text-profit" />
                              ) : (
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                              )}
                              {done ? finished : running}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })
              )}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start gap-2">
                  <div className="mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Robot size={13} weight="fill" />
                  </div>
                  <ThinkingDots />
                </div>
              )}
              <div ref={bottomRef} className="h-px" />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 border-t border-line p-3"
            >
              <textarea
                aria-label="Message Mochi assistant"
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask Mochi anything"
                rows={1}
                className="max-h-32 min-h-[44px] w-full resize-none rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-3 text-[13px] text-fg placeholder:text-fg-faint transition-colors focus-visible:border-accent focus-visible:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-[var(--color-on-accent)] transition-transform hover:enabled:scale-[1.03] active:enabled:scale-95 disabled:opacity-40"
              >
                <PaperPlaneRight size={18} weight="fill" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
