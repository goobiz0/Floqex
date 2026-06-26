"use client";

import { useMemo, useRef, useState } from "react";
import {
  Play,
  CheckCircle,
  WarningCircle,
  Code,
  ArrowCounterClockwise,
  CaretDown,
  Lightning,
  Info,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { LANGUAGES, INDICATORS, languageMeta, type StrategyLanguage } from "@/lib/custom-strategy";
import { cn } from "@/lib/utils";

type ValidateResponse = {
  ok: boolean;
  compiled: boolean;
  error?: string;
  message?: string;
  signal?: { side: "LONG" | "SHORT" } | null;
  logs?: string[];
  evaluatedAt?: number | null;
};

export function StrategyCodeEditor({
  language,
  onLanguageChange,
  code,
  onCodeChange,
  sampleSymbol,
}: {
  language: StrategyLanguage;
  onLanguageChange: (l: StrategyLanguage) => void;
  code: string;
  onCodeChange: (c: string) => void;
  sampleSymbol?: string;
}) {
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const meta = languageMeta(language);
  const lineCount = useMemo(() => Math.max(code.split("\n").length, 1), [code]);

  function syncScroll() {
    if (gutterRef.current && taRef.current) gutterRef.current.scrollTop = taRef.current.scrollTop;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = code.slice(0, start) + "  " + code.slice(end);
      onCodeChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }

  async function validate() {
    setValidating(true);
    setResult(null);
    try {
      const res = await fetch("/api/strategy/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, symbol: sampleSymbol }),
      });
      const data = (await res.json()) as ValidateResponse;
      setResult(data);
    } catch {
      setResult({ ok: false, compiled: false, error: "Could not reach the validator. Check your connection and try again." });
    } finally {
      setValidating(false);
    }
  }

  function resetTemplate() {
    const tpl = languageMeta(language)?.template;
    if (tpl) {
      onCodeChange(tpl);
      setResult(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Language tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {LANGUAGES.map((l) => {
          const active = l.id === language;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onLanguageChange(l.id);
                setResult(null);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-surface text-fg-subtle hover:text-fg",
              )}
            >
              <Code size={14} weight="bold" />
              {l.label}
              <span
                className={cn(
                  "rounded-[var(--radius-pill)] px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
                  l.executesLive ? "bg-profit/15 text-profit" : "bg-warning-soft text-warning",
                )}
              >
                {l.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Honest execution note */}
      {meta && !meta.executesLive && (
        <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-warning/30 bg-warning-soft/40 px-3 py-2 text-xs leading-relaxed text-fg-muted">
          <Info size={15} weight="fill" className="mt-px shrink-0 text-warning" />
          <span>
            {meta.label} is in beta. Your code is saved and validated for structure now. Live order execution for {meta.label} is rolling out. JavaScript executes in the live engine today.
          </span>
        </div>
      )}

      {/* Editor */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-base">
        <div className="flex items-center justify-between border-b border-line bg-surface/50 px-3 py-2">
          <span className="flex items-center gap-2 text-xs font-medium text-fg-subtle">
            <Lightning size={13} weight="fill" className="text-accent" />
            strategy.{language === "python" ? "py" : language === "pinescript" ? "pine" : "js"}
          </span>
          <button
            type="button"
            onClick={resetTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle transition-colors hover:text-fg"
          >
            <ArrowCounterClockwise size={13} /> Reset to template
          </button>
        </div>
        <div className="flex max-h-[360px] min-h-[240px]">
          <div
            ref={gutterRef}
            aria-hidden
            className="select-none overflow-hidden bg-surface/30 px-3 py-3 text-right font-mono text-[13px] leading-[1.6] text-fg-faint"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={taRef}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            aria-label="Strategy code editor"
            className="min-h-[240px] w-full resize-y bg-transparent px-3 py-3 font-mono text-[13px] leading-[1.6] text-fg outline-none placeholder:text-fg-faint"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={validate} disabled={validating || !code.trim()}>
          <Play size={15} weight="fill" />
          {validating ? "Running…" : "Validate & test run"}
        </Button>
        <button
          type="button"
          onClick={() => setShowRef((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle transition-colors hover:text-fg"
        >
          <CaretDown size={13} className={cn("transition-transform", showRef && "rotate-180")} />
          Available data &amp; return contract
        </button>
        {sampleSymbol && (
          <span className="ml-auto text-xs text-fg-faint">
            Tests against{" "}
            <Tooltip content="We run your code once against the most recent real market data for this symbol and show what it would decide right now.">
              <span className="font-semibold tnum text-fg-subtle underline decoration-dotted underline-offset-2">{sampleSymbol}</span>
            </Tooltip>
          </span>
        )}
      </div>

      {/* API reference */}
      {showRef && (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface/40 p-4 text-xs">
          <p className="mb-2 font-medium text-fg">Return contract</p>
          <p className="mb-3 leading-relaxed text-fg-muted">
            Return <code className="rounded bg-base px-1 py-0.5 font-mono text-accent">{`{ side: "LONG" }`}</code> or{" "}
            <code className="rounded bg-base px-1 py-0.5 font-mono text-accent">{`{ side: "SHORT" }`}</code> to enter a trade,
            optionally with <code className="rounded bg-base px-1 py-0.5 font-mono text-fg-muted">stopLossPct</code> and{" "}
            <code className="rounded bg-base px-1 py-0.5 font-mono text-fg-muted">targetRatio</code>. Return{" "}
            <code className="rounded bg-base px-1 py-0.5 font-mono text-fg-muted">null</code> to stay flat. Risk management
            and position sizing are always applied by the engine on top of your signal.
          </p>
          <p className="mb-2 font-medium text-fg">Available indicators on <code className="font-mono text-accent">ctx</code></p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {INDICATORS.map((ind) => (
              <div key={ind.key} className="flex items-baseline gap-1.5">
                <code className="font-mono text-[11px] text-fg">ctx.{ind.key}</code>
                <span className="truncate text-[11px] text-fg-faint">{ind.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation result */}
      {result && (
        <div
          className={cn(
            "rounded-[var(--radius-card)] border p-4",
            result.compiled ? "border-profit/30 bg-profit/5" : "border-negative/30 bg-negative/5",
          )}
        >
          <div className="flex items-center gap-2">
            {result.compiled ? (
              <CheckCircle size={18} weight="fill" className="text-profit" />
            ) : (
              <WarningCircle size={18} weight="fill" className="text-negative" />
            )}
            <p className={cn("text-sm font-semibold", result.compiled ? "text-profit" : "text-negative")}>
              {result.compiled ? "Code is valid" : "Code has a problem"}
            </p>
          </div>
          {result.error && <p className="mt-2 font-mono text-xs text-negative">{result.error}</p>}
          {result.compiled && (
            <div className="mt-3 space-y-2 text-xs text-fg-muted">
              <p>
                Decision on the latest bar:{" "}
                {result.signal ? (
                  <span className={cn("font-semibold", result.signal.side === "LONG" ? "text-profit" : "text-negative")}>
                    Enter {result.signal.side}
                  </span>
                ) : (
                  <span className="font-semibold text-fg">Stay flat (no entry right now)</span>
                )}
              </p>
              {result.message && <p className="text-fg-subtle">{result.message}</p>}
              {result.logs && result.logs.length > 0 && (
                <pre className="overflow-x-auto rounded-[var(--radius-control)] border border-line bg-base p-2 font-mono text-[11px] text-fg-subtle">
                  {result.logs.join("\n")}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
