"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Robot, Check, Microphone, ArrowUp, Trash, StopCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { applyStrategyChanges } from "@/app/dashboard/settings/actions";

const SUGGESTIONS = [
  "How am I doing so far?",
  "Is my bot running?",
  "Odds of 50% drawdown at 1% risk, 55% win, 2R?",
  "Lower my risk to 0.5%",
];

const STORAGE_KEY = "mochi_chat_v2";

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

const fmtTokens = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const fmt$ = (n: number) =>
  `${n >= 0 ? "+" : ""}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

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

function LoadingChip({ label }: { label: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-accent">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
      {label}
    </div>
  );
}

function DoneChip({ label }: { label: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-full border border-line bg-base px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-fg-muted">
      <Check size={12} weight="bold" className="text-profit" />
      {label}
    </div>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

type ToolPart = {
  type: string;
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available";
  input: Record<string, unknown>;
  output?: unknown;
};

function renderToolPart(
  tp: ToolPart,
  pendingToolId: string | null,
  onAccept: (toolCallId: string, args: Record<string, unknown>) => void,
  onDecline: (toolCallId: string) => void,
) {
  const toolName = tp.type.replace(/^tool-/, "");
  const isDone = tp.state === "output-available";
  const out = tp.output as Record<string, unknown> | undefined;

  // updateStrategyParams — human-in-the-loop
  if (toolName === "updateStrategyParams") {
    if (!isDone) {
      const busy = pendingToolId === tp.toolCallId;
      return (
        <div className="mt-3 overflow-hidden rounded-[12px] border border-accent/20 bg-accent-soft p-3">
          <p className="mb-2 text-[12px] font-medium text-accent">Mochi proposes changes:</p>
          <pre className="mb-3 overflow-x-auto rounded bg-base/50 p-2 text-[11px] text-accent/90">
            {JSON.stringify(tp.input, null, 2)}
          </pre>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => onAccept(tp.toolCallId, tp.input)}
              className="flex-1 rounded-[6px] bg-accent py-1.5 text-[11px] font-semibold text-[var(--color-on-accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Applying..." : "Accept & Apply"}
            </button>
            <button
              disabled={busy}
              onClick={() => onDecline(tp.toolCallId)}
              className="flex-1 rounded-[6px] border border-accent/30 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      );
    }
    const ok = (out as { ok?: boolean } | undefined)?.ok;
    return (
      <div className="mt-3 flex items-center gap-2 rounded-full border border-line bg-base px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-fg-muted">
        {ok ? (
          <Check size={12} weight="bold" className="text-profit" />
        ) : (
          <X size={12} weight="bold" className="text-negative" />
        )}
        {ok ? "Changes Applied" : "Changes Declined / Failed"}
      </div>
    );
  }

  // calculate
  if (toolName === "calculate") {
    if (!isDone) return <LoadingChip label="Calculating" />;
    const calc = out as { expression?: string; result?: number; error?: string } | undefined;
    return (
      <div className="mt-3 rounded-[10px] border border-line bg-base px-3 py-2 font-mono text-[12px] text-fg">
        {calc?.error ? (
          <span className="text-negative">{calc.error}</span>
        ) : (
          <span>
            <span className="text-fg-subtle">{calc?.expression} =</span>{" "}
            <span className="font-semibold text-accent">{calc?.result}</span>
          </span>
        )}
      </div>
    );
  }

  // runMonteCarlo
  if (toolName === "runMonteCarlo") {
    if (!isDone) return <LoadingChip label="Running simulation" />;
    const mc = out as {
      startingBalance?: number;
      trades?: number;
      simulations?: number;
      mean?: number;
      p10?: number;
      p50?: number;
      p90?: number;
      ruinProbability?: number;
      samplePath?: number[];
    };
    const money = (n?: number) =>
      `$${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return (
      <div className="mt-3 rounded-[12px] border border-line bg-base p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Monte Carlo · {mc.simulations} runs · {mc.trades} trades
          </p>
          <span
            className={cn(
              "text-[11px] font-semibold",
              (mc.ruinProbability ?? 0) > 25 ? "text-negative" : "text-fg-muted",
            )}
          >
            {mc.ruinProbability}% ruin risk
          </span>
        </div>
        <MonteCarloChart path={mc.samplePath ?? []} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-fg-subtle">
          <div className="flex justify-between border-b border-line pb-1">
            <span>Worst 10%</span>
            <span className="font-semibold text-fg">{money(mc.p10)}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-1">
            <span>Median</span>
            <span className="font-semibold text-fg">{money(mc.p50)}</span>
          </div>
          <div className="flex justify-between">
            <span>Top 10%</span>
            <span className="font-semibold text-fg">{money(mc.p90)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mean</span>
            <span className="font-semibold text-fg">{money(mc.mean)}</span>
          </div>
        </div>
      </div>
    );
  }

  // getPerformance
  if (toolName === "getPerformance") {
    if (!isDone) return <LoadingChip label="Reading performance" />;
    const perf = out as {
      days?: number;
      trades?: number;
      winRate?: string;
      netPnl?: string;
      profitFactor?: string;
      expectancy?: string;
      avgWin?: string;
      avgLoss?: string;
      error?: string;
    };
    if (perf?.error) return <DoneChip label="Performance loaded" />;
    return (
      <div className="mt-3 rounded-[12px] border border-line bg-base p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          Performance · {perf.days}d
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px]">
          {([
            ["Trades", String(perf.trades ?? 0)],
            ["Win rate", perf.winRate ?? "-"],
            ["Net P/L", perf.netPnl ?? "-"],
            ["Profit factor", perf.profitFactor ?? "-"],
            ["Expectancy", perf.expectancy ?? "-"],
            ["Avg win / loss", perf.avgWin && perf.avgLoss ? `${perf.avgWin} / ${perf.avgLoss}` : "-"],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-fg-subtle">{label}</span>
              <span className="font-semibold text-fg">{val}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // getBotStatus
  if (toolName === "getBotStatus") {
    if (!isDone) return <LoadingChip label="Checking bot status" />;
    const bot = out as {
      bots?: number;
      running?: number;
      openPositions?: number;
      detail?: { account: string; status: string; strategy: string }[];
    };
    return (
      <div className="mt-3 rounded-[12px] border border-line bg-base p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          Bot Status
        </p>
        <div className="mb-2 flex items-center gap-4 text-[11px]">
          <span>
            <span className="font-semibold text-fg">{bot.bots ?? 0}</span>{" "}
            <span className="text-fg-subtle">bots</span>
          </span>
          <span>
            <span className="font-semibold text-profit">{bot.running ?? 0}</span>{" "}
            <span className="text-fg-subtle">running</span>
          </span>
          <span>
            <span className="font-semibold text-fg">{bot.openPositions ?? 0}</span>{" "}
            <span className="text-fg-subtle">open</span>
          </span>
        </div>
        {(bot.detail ?? []).map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-t border-line/50 py-1 text-[10px]"
          >
            <span className="text-fg-subtle">{d.account}</span>
            <span className={cn("font-semibold", d.status === "RUNNING" ? "text-profit" : "text-fg-muted")}>
              {d.status}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // analyzeEdge
  if (toolName === "analyzeEdge") {
    if (!isDone) return <LoadingChip label="Analyzing edge" />;
    const edge = out as {
      trades?: number;
      winRate?: string;
      breakEvenWinRate?: string;
      expectancyPerR?: string;
      halfKellyPct?: string;
      profitFactor?: string;
      verdict?: string;
      error?: string;
    };
    if (edge?.error) {
      return (
        <div className="mt-3 rounded-[10px] border border-line bg-base px-3 py-2 text-[12px] text-fg-subtle">
          {edge.error}
        </div>
      );
    }
    const verdictColor = edge.verdict?.includes("detected")
      ? "text-profit"
      : edge.verdict?.includes("No edge")
      ? "text-negative"
      : "text-fg-subtle";
    return (
      <div className="mt-3 rounded-[12px] border border-line bg-base p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          Edge Analysis · {edge.trades} trades
        </p>
        <p className={cn("mb-3 text-[12px] font-medium leading-snug", verdictColor)}>
          {edge.verdict}
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px]">
          {([
            ["Win rate", edge.winRate ?? "-"],
            ["Break-even", edge.breakEvenWinRate ?? "-"],
            ["Expectancy", edge.expectancyPerR ?? "-"],
            ["Profit factor", edge.profitFactor ?? "-"],
            ["Half-Kelly risk", edge.halfKellyPct ?? "-"],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-fg-subtle">{label}</span>
              <span className="font-semibold text-fg">{val}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // getBreakdown
  if (toolName === "getBreakdown") {
    if (!isDone) return <LoadingChip label="Loading breakdown" />;
    const bd = out as {
      byInstrument?: Record<string, number>;
      bySession?: Record<string, number>;
      byWeekday?: Record<string, number>;
    };
    const instruments = Object.entries(bd.byInstrument ?? {})
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 5);
    return (
      <div className="mt-3 space-y-3 rounded-[12px] border border-line bg-base p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          Breakdown
        </p>
        {/* Session */}
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-fg-muted">Session</p>
          {Object.entries(bd.bySession ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5 text-[10px]">
              <span className="text-fg-subtle">{k}</span>
              <span className={cn("font-semibold", v >= 0 ? "text-profit" : "text-negative")}>
                {fmt$(v)}
              </span>
            </div>
          ))}
        </div>
        {/* Top instruments */}
        {instruments.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-fg-muted">Instruments</p>
            {instruments.map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5 text-[10px]">
                <span className="text-fg-subtle">{k}</span>
                <span className={cn("font-semibold", v >= 0 ? "text-profit" : "text-negative")}>
                  {fmt$(v)}
                </span>
              </div>
            ))}
          </div>
        )}
        {/* Weekday */}
        {Object.keys(bd.byWeekday ?? {}).length > 0 && (
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-fg-muted">Day of week</p>
            <div className="flex gap-1">
              {Object.entries(bd.byWeekday ?? {}).map(([day, v]) => (
                <div key={day} className="flex-1 text-center">
                  <p className="text-[9px] text-fg-muted">{day}</p>
                  <p
                    className={cn(
                      "text-[10px] font-semibold",
                      v > 0 ? "text-profit" : v < 0 ? "text-negative" : "text-fg-muted",
                    )}
                  >
                    {v === 0 ? "-" : v > 0 ? `+${v.toFixed(0)}` : v.toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Generic fallback chip for any other tool
  const labels: Record<string, [string, string]> = {
    calculate: ["Calculating", "Calculated"],
    runMonteCarlo: ["Running simulation", "Simulation complete"],
    getPerformance: ["Reading performance", "Performance loaded"],
    getBotStatus: ["Checking bot status", "Status loaded"],
    analyzeEdge: ["Analyzing edge", "Edge analysis complete"],
    getBreakdown: ["Loading breakdown", "Breakdown loaded"],
  };
  const [running, finished] = labels[toolName] ?? [`Running ${toolName}`, `${toolName} done`];
  return isDone ? <DoneChip label={finished} /> : <LoadingChip label={running} />;
}

export function MochiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listenTime, setListenTime] = useState(0);
  const reduce = useReducedMotion();
  const [input, setInput] = useState("");
  const [pendingToolId, setPendingToolId] = useState<string | null>(null);

  const { messages, sendMessage, status, stop, addToolResult, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  const [usage, setUsage] = useState<MochiUsage | null>(null);
  const restoredRef = useRef(false);

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
      /* quota / serialization non-fatal */
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mochi/usage");
        if (!cancelled && res.ok) setUsage(await res.json());
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isStreaming]);

  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      setInput((prev) => (prev + final).slice(0, 500));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => setListenTime((t) => t + 1), 1000);
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
  }, [isListening]);

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    if (isStreaming) {
      stop();
      return;
    }
    const text = input.trim();
    if (!text) return;
    setIsOpen(true);
    setInput("");
    sendMessage({ text });
  };

  const handleToolAccept = async (toolCallId: string, args: Record<string, unknown>) => {
    if (pendingToolId) return;
    setPendingToolId(toolCallId);
    try {
      const res = await applyStrategyChanges(args);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (addToolResult as any)({ toolCallId, output: res });
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (addToolResult as any)({ toolCallId, output: { ok: false, message: "Server error" } });
    } finally {
      setPendingToolId(null);
    }
  };

  const handleToolDecline = (toolCallId: string) => {
    if (pendingToolId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (addToolResult as any)({ toolCallId, output: { ok: false, message: "User declined the changes." } });
  };

  const handleClearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* non-fatal */
    }
  };

  const spring = { type: "spring" as const, damping: 26, stiffness: 280, mass: 0.6 };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
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
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    aria-label="Clear chat"
                    title="Clear chat"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg active:scale-95"
                  >
                    <Trash size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>
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
                  <div className="mt-6 flex w-full flex-col justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput(s)}
                        className="rounded-xl border border-line bg-surface px-4 py-2.5 text-left text-[12px] font-medium text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === "user";
                  const parts = m.parts ?? [];

                  // Extract text for user bubbles
                  const textContent = parts
                    .filter((p) => p.type === "text")
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((p) => (p as any).text as string)
                    .join("");

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
                        {isUser ? (
                          <div className="whitespace-pre-wrap">{textContent}</div>
                        ) : (
                          parts.map((part, idx) => {
                            if (part.type === "text") {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const text = (part as any).text as string;
                              if (!text) return null;
                              return (
                                <div key={idx} className="whitespace-pre-wrap">
                                  {text}
                                </div>
                              );
                            }
                            if (part.type.startsWith("tool-")) {
                              const tp = part as unknown as ToolPart;
                              return (
                                <div key={tp.toolCallId ?? idx}>
                                  {renderToolPart(tp, pendingToolId, handleToolAccept, handleToolDecline)}
                                </div>
                              );
                            }
                            return null;
                          })
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}

              {isStreaming && messages[messages.length - 1]?.role === "user" && (
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
                  <span className="font-medium uppercase tracking-wider">
                    Weekly tokens · {usage.plan}
                  </span>
                  <span className="tnum">
                    {fmtTokens(usage.usedWeek)} / {fmtTokens(usage.limitWeek)}
                    {usage.lastMessageTokens > 0 && (
                      <span className="text-fg-faint"> · last {fmtTokens(usage.lastMessageTokens)}</span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      usage.blocked ? "bg-negative" : "bg-accent",
                    )}
                    style={{
                      width: `${Math.min(100, (usage.usedWeek / Math.max(1, usage.limitWeek)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Input form */}
            <form onSubmit={onFormSubmit} className="flex border-t border-line bg-base px-3 py-3">
              <div className="relative flex flex-1 items-center gap-2 overflow-hidden rounded-full border border-line bg-surface px-2 pl-4 transition-colors focus-within:border-line-strong">
                {isListening && (
                  <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-start">
                    <div className="h-full w-full animate-pulse bg-gradient-to-r from-rose-500/10 via-fuchsia-500/10 to-transparent" />
                  </div>
                )}

                {isListening ? (
                  <div className="relative z-10 flex flex-1 animate-pulse items-center gap-2 py-2 font-mono text-[13px] font-medium text-rose-500">
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
                        : "text-fg-subtle hover:bg-surface-hover hover:text-fg",
                    )}
                    title="Voice input"
                  >
                    <Microphone size={16} weight={isListening ? "fill" : "regular"} />
                  </button>
                  <button
                    type="submit"
                    disabled={!isStreaming && !input.trim() && !isListening}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[var(--color-on-accent)] transition-transform hover:enabled:scale-[1.05] active:enabled:scale-95 disabled:opacity-40"
                    title={isStreaming ? "Stop" : "Send"}
                  >
                    {isStreaming ? (
                      <StopCircle size={16} weight="fill" />
                    ) : (
                      <ArrowUp size={16} weight="bold" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
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
            {messages.length > 0 && !isStreaming && (
              <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-base bg-profit" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
