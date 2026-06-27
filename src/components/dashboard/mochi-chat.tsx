"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Robot, Check, Microphone, ArrowUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { applyStrategyChanges } from "@/app/dashboard/settings/actions";

const SUGGESTIONS = [
  "How am I doing so far?",
  "Is my bot running?",
  "Odds of 50% drawdown at 1% risk, 55% win, 2R?",
  "Lower my risk to 0.5%",
];

const STORAGE_KEY = "mochi_chat_v1";

type MochiUsage = {
  plan: string;
  used5h: number;
  usedWeek: number;
  limit5h: number;
  limitWeek: number;
  lastMessageTokens: number;
  blocked: boolean;
  window: "5h" | "week" | null;
};

const fmtTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

// Compact equity-path sparkline for a Monte Carlo result.
function MonteCarloChart({ path }: { path: number[] }) {
  if (!path || path.length < 2) return null;
  const min = Math.min(...path);
  const max = Math.max(...path);
  const span = max - min || 1;
  const W = 240;
  const H = 56;
  const pts = path
    .map((v, i) => {
      const x = (i / (path.length - 1)) * W;
      const y = H - 4 - ((v - min) / span) * (H - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = path[path.length - 1] >= path[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-14 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={up ? "var(--color-profit)" : "var(--color-negative)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-3 rounded-[18px] rounded-bl-[6px] border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0.15s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0.3s]" />
      </div>
      <span className="text-xs font-medium text-fg-subtle">Thinking</span>
    </div>
  );
}

// Format duration from seconds
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function MochiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listenTime, setListenTime] = useState(0);
  const reduce = useReducedMotion();
  const [input, setInput] = useState("");
  const [pendingToolId, setPendingToolId] = useState<string | null>(null);
  // @ts-ignore - Vercel AI SDK generic type mismatch for useChat return type
  const { messages, append, isLoading, addToolResult, setMessages, error } = useChat({
    api: "/api/chat",
  } as any);
  
  const [usage, setUsage] = useState<MochiUsage | null>(null);
  const restoredRef = useRef(false);

  // Persist the conversation so switching dashboard pages, changing tabs, or a
  // refresh never loses what Mochi was doing. Restore once on mount.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, [setMessages]);

  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* quota / serialization issues are non-fatal */
    }
  }, [messages]);

  // Refresh usage whenever the panel is open and the chat status changes (so it
  // updates after each reply finishes). The fetch + setState live inside an
  // async IIFE so nothing runs synchronously in the effect body.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mochi/usage");
        if (!cancelled && res.ok) setUsage(await res.json());
      } catch {
        /* offline; keep last known usage */
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, isLoading]);
  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  // Web Speech API setup
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        // Combine with existing input, ensuring we don't exceed 500 chars
        setInput((prev) => {
          const newVal = prev + finalTranscript;
          return newVal.slice(0, 500);
        });
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [setInput]);

  // Listening Timer
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setListenTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  const toggleListen = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput("");
      recognitionRef.current?.start();
      setListenTime(0);
      setIsListening(true);
      setIsOpen(true);
    }
  }, [isListening, setInput]);

  const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    const text = input.trim();
    if (!text) return;
    setIsOpen(true);
    // Optimistically clear the draft; restore it if the send rejects so the
    // user doesn't lose their message. append is async in AI SDK v6.
    setInput("");
    try {
      await append({ role: 'user', content: text });
    } catch (err) {
      console.error("Chat submit error", err);
      setInput(text);
    }
  };

  const handleToolAccept = async (toolCallId: string, args: Record<string, unknown>) => {
    if (pendingToolId) return; // ignore double-clicks / accept-vs-decline races
    setPendingToolId(toolCallId);
    try {
      const res = await applyStrategyChanges(args);
      addToolResult({ toolCallId, result: res } as any);
    } catch {
      addToolResult({ toolCallId, result: { ok: false, message: "Server error" } } as any);
    } finally {
      setPendingToolId(null);
    }
  };

  const handleToolDecline = (toolCallId: string) => {
    if (pendingToolId) return;
    addToolResult({ toolCallId, result: { ok: false, message: "User declined the changes." } } as any);
  };

  const spring = { type: "spring" as const, damping: 26, stiffness: 280, mass: 0.6 };
  const showDialog = isOpen;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {showDialog && (
          <motion.div
            role="dialog"
            aria-label="Mochi assistant"
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96, originX: 1, originY: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.15 } }}
            transition={spring}
            className="mb-4 flex h-[500px] max-h-[calc(100dvh-7rem)] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[24px] border border-line bg-base shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-[var(--color-on-accent)]">
                  <Robot size={20} weight="fill" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-base bg-profit" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-fg">Mochi</h3>
                  <p className="text-[11px] text-fg-subtle">Your trading copilot</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[16px] bg-accent-soft text-accent">
                    <Robot size={32} weight="fill" />
                  </div>
                  <p className="mt-5 text-[15px] font-medium text-fg">How can I help?</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-fg-subtle">
                    Ask about your performance, the bot, or tune your strategy in plain English.
                  </p>
                  <div className="mt-6 flex flex-col justify-center gap-2 w-full">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput(s)}
                        className="rounded-xl border border-line bg-surface px-4 py-2.5 text-[12px] font-medium text-left text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
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
                      className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}
                    >
                      {!isUser && (
                        <div className="mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                          <Robot size={15} weight="fill" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-[20px] px-4 py-3 text-[14px] leading-relaxed",
                          isUser
                            ? "rounded-br-[8px] bg-accent text-[var(--color-on-accent)] shadow-sm"
                            : "rounded-bl-[8px] border border-line bg-surface text-fg",
                        )}
                      >
                        {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                        {m.toolInvocations?.map((toolInvocation) => {
                          const toolCallId = toolInvocation.toolCallId;
                          if (toolInvocation.toolName === "updateStrategyParams") {
                            if (!('result' in toolInvocation)) {
                              const args = toolInvocation.args as Record<string, unknown>;
                              const busy = pendingToolId === toolCallId;
                              return (
                                <div key={toolCallId} className="mt-3 overflow-hidden rounded-[12px] border border-accent/20 bg-accent-soft p-3">
                                  <p className="text-[12px] font-medium text-accent mb-2">Mochi proposes changes:</p>
                                  <pre className="text-[11px] text-accent/90 mb-3 bg-base/50 p-2 rounded overflow-x-auto">{JSON.stringify(args, null, 2)}</pre>
                                  <div className="flex gap-2">
                                    <button
                                      disabled={busy}
                                      onClick={() => handleToolAccept(toolCallId, args)}
                                      className="flex-1 rounded-[6px] bg-accent py-1.5 text-[11px] font-semibold text-[var(--color-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {busy ? "Applying…" : "Accept & Apply"}
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => handleToolDecline(toolCallId)}
                                      className="flex-1 rounded-[6px] border border-accent/30 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              const res = toolInvocation.result as { ok?: boolean } | undefined;
                              const ok = res?.ok;
                              return (
                                <div key={toolCallId} className="mt-3 flex items-center gap-2 rounded-full border border-line bg-base px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-fg-muted">
                                  {ok ? <Check size={12} weight="bold" className="text-profit" /> : <X size={12} weight="bold" className="text-negative" />}
                                  {ok ? "Changes Applied" : "Changes Declined / Failed"}
                                </div>
                              );
                            }
                          }
                          
                          if (toolInvocation.toolName === "calculate" && 'result' in toolInvocation) {
                            const out = (toolInvocation.result ?? {}) as { expression?: string; result?: number; error?: string };
                            return (
                              <div key={toolCallId} className="mt-3 rounded-[10px] border border-line bg-base px-3 py-2 font-mono text-[12px] text-fg">
                                {out.error ? (
                                  <span className="text-negative">{out.error}</span>
                                ) : (
                                  <span><span className="text-fg-subtle">{out.expression} =</span> <span className="font-semibold text-accent">{out.result}</span></span>
                                )}
                              </div>
                            );
                          }

                          if (toolInvocation.toolName === "runMonteCarlo" && 'result' in toolInvocation) {
                            const mc = (toolInvocation.result ?? {}) as {
                              startingBalance?: number; trades?: number; simulations?: number; mean?: number;
                              p10?: number; p50?: number; p90?: number; ruinProbability?: number; samplePath?: number[];
                            };
                            const money = (n?: number) => `$${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                            return (
                                <div key={toolCallId} className="mt-3 rounded-[12px] border border-line bg-base p-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Monte Carlo · {mc.simulations} runs · {mc.trades} trades</p>
                                    <span className={cn("text-[11px] font-semibold", (mc.ruinProbability ?? 0) > 25 ? "text-negative" : "text-fg-muted")}>
                                      {mc.ruinProbability}% risk of 50% drawdown
                                    </span>
                                  </div>
                                  <MonteCarloChart path={mc.samplePath ?? []} />
                                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-fg-subtle">
                                    <div className="flex justify-between border-b border-line pb-1"><span>Worst 10%</span> <span className="font-semibold text-fg">{money(mc.p10)}</span></div>
                                    <div className="flex justify-between border-b border-line pb-1"><span>Median</span> <span className="font-semibold text-fg">{money(mc.p50)}</span></div>
                                    <div className="flex justify-between"><span>Top 10%</span> <span className="font-semibold text-fg">{money(mc.p90)}</span></div>
                                    <div className="flex justify-between"><span>Mean</span> <span className="font-semibold text-fg">{money(mc.mean)}</span></div>
                                  </div>
                                </div>
                            );
                          }

                          const labels: Record<string, [string, string]> = {
                            getPerformance: ["Reading performance", "Performance loaded"],
                            getBotStatus: ["Checking bot status", "Status loaded"],
                            calculate: ["Calculating", "Calculated"],
                            runMonteCarlo: ["Running simulation", "Simulation complete"],
                          };
                          const toolName = toolInvocation.toolName;
                          const isResult = 'result' in toolInvocation;
                          const [running, finished] = labels[toolName] ?? [`Running ${toolName}`, `${toolName} done`];
                          return (
                            <div
                              key={toolCallId}
                              className={cn(
                                "mt-3 flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase",
                                isResult ? "border-line bg-base text-fg-muted" : "border-accent/30 bg-accent-soft text-accent"
                              )}
                            >
                              {isResult ? <Check size={12} weight="bold" className="text-profit" /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
                              {isResult ? finished : running}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })
              )}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start gap-3">
                  <div className="mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Robot size={15} weight="fill" />
                  </div>
                  <ThinkingDots />
                </div>
              )}
              {error && (
                <div className="rounded-[10px] border border-negative/30 bg-negative-soft px-3 py-2 text-[12px] text-negative">
                  {usage?.blocked
                    ? `You've hit your Mochi ${usage.window === "week" ? "weekly" : "5-hour"} token limit. It resets as the window rolls forward, or upgrade for more.`
                    : "Mochi hit a snag. Please try again."}
                </div>
              )}
              <div ref={bottomRef} className="h-px" />
            </div>

            {/* Usage meter */}
            {usage && (
              <div className="border-t border-line bg-base px-4 pt-2.5">
                <div className="flex items-center justify-between text-[10px] text-fg-subtle">
                  <span className="font-medium uppercase tracking-wider">Weekly tokens · {usage.plan}</span>
                  <span className="tnum">
                    {fmtTokens(usage.usedWeek)} / {fmtTokens(usage.limitWeek)}
                    {usage.lastMessageTokens > 0 && <span className="text-fg-faint"> · last {fmtTokens(usage.lastMessageTokens)}</span>}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", usage.blocked ? "bg-negative" : "bg-accent")}
                    style={{ width: `${Math.min(100, (usage.usedWeek / Math.max(1, usage.limitWeek)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Input Form inside the Dialog */}
            <form
              onSubmit={onFormSubmit}
              className="flex border-t border-line bg-base px-3 py-3"
            >
              <div className="relative flex-1 flex items-center gap-2 rounded-full border border-line bg-surface px-2 pl-4 transition-colors focus-within:border-line-strong overflow-hidden">
                {isListening && (
                  <div className="absolute inset-0 z-0 flex items-center justify-start pointer-events-none">
                    <div className="h-full w-full bg-gradient-to-r from-rose-500/10 via-fuchsia-500/10 to-transparent animate-pulse" />
                  </div>
                )}
                
                {isListening ? (
                  <div className="relative z-10 flex-1 flex items-center gap-2 font-mono text-[13px] font-medium text-rose-500 animate-pulse py-2">
                    <span>Listening...</span>
                    <span>{formatDuration(listenTime)}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    maxLength={500}
                    aria-label="Message Mochi assistant"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Mochi..."
                    className="w-full bg-transparent py-2.5 text-[14px] font-medium text-fg placeholder:text-fg-faint focus:outline-none"
                  />
                )}
                <div className="relative z-10 flex shrink-0 items-center gap-1.5 pr-1">
                  <button
                    type="button"
                    onClick={toggleListen}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                      isListening
                        ? "bg-negative text-white"
                        : "text-fg-subtle hover:text-fg hover:bg-surface-hover"
                    )}
                    title="Voice Input"
                  >
                    <Microphone size={16} weight={isListening ? "fill" : "regular"} />
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !isListening)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[var(--color-on-accent)] transition-transform hover:enabled:scale-[1.05] active:enabled:scale-95 disabled:opacity-40"
                  >
                    <ArrowUp size={16} weight="bold" />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[var(--color-on-accent)] shadow-xl shadow-accent/20 transition-transform hover:scale-105 active:scale-95"
            aria-label="Open Mochi Chat"
          >
            <Robot size={24} weight="fill" />
            {messages.length > 0 && !isLoading && (
              <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-base bg-profit" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
