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
  Copy,
  MagicWand,
  TextAlignLeft,
  Lock,
  Star,
  Warning,
  ArrowsOut,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  LANGUAGES,
  INDICATORS,
  languageMeta,
  LANGUAGE_REFERENCE,
  type StrategyLanguage,
} from "@/lib/custom-strategy";
import { snippetsForLanguage } from "@/lib/strategy-snippets";
import { cn } from "@/lib/utils";

const UPGRADE_HREF = "/dashboard/billing";

type ValidateResponse = {
  ok: boolean;
  compiled: boolean;
  error?: string;
  message?: string;
  signal?: { side: "LONG" | "SHORT" } | null;
  logs?: string[];
  evaluatedAt?: number | null;
  mapping?: { source: string; resolvesTo: string }[];
  warnings?: string[];
  summary?: { long?: string; short?: string };
};

function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
      <Star size={9} weight="fill" /> Pro
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="rounded-[var(--radius-pill)] bg-profit/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-profit">
      Runs live
    </span>
  );
}

export function StrategyCodeEditor({
  language,
  onLanguageChange,
  code,
  onCodeChange,
  sampleSymbol,
  isFree,
}: {
  language: StrategyLanguage;
  onLanguageChange: (l: StrategyLanguage) => void;
  code: string;
  onCodeChange: (c: string) => void;
  sampleSymbol?: string;
  isFree?: boolean;
}) {
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const meta = languageMeta(language);
  const isProLang = meta?.pro ?? false;
  const isLocked = isFree && isProLang;

  const lineCount = useMemo(() => Math.max(code.split("\n").length, 1), [code]);
  const snippets = useMemo(() => snippetsForLanguage(language), [language]);

  // Filename extension per language
  const fileExt = language === "python" ? "py" : language === "javascript" ? "js" : "pine";

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

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard.");
    } catch {
      toast.error("Could not copy. Select and copy manually.");
    }
  }

  function formatCode() {
    if (language !== "javascript" && language !== "python") return;
    // Light normalization: tabs -> 2 spaces, trim trailing whitespace per line
    const formatted = code
      .split("\n")
      .map((line) => line.replace(/\t/g, "  ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n"); // collapse 3+ blank lines to 2
    onCodeChange(formatted);
    toast.success("Code formatted.");
  }

  function insertSnippet(snippetCode: string) {
    onCodeChange(snippetCode);
    setShowSnippets(false);
    setResult(null);
    toast.success("Snippet inserted.");
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
                setShowSnippets(false);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-surface text-fg-subtle hover:text-fg",
              )}
            >
              <Code size={14} weight={active ? "fill" : "bold"} />
              {l.label}
              {l.pro ? <ProBadge /> : <LiveBadge />}
            </button>
          );
        })}
      </div>

      {/* Pro upsell lock for free users on pro languages */}
      {isLocked ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-[var(--radius-card)] border border-accent/20 bg-accent/5 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-pill)] bg-accent/15">
            <Lock size={28} weight="fill" className="text-accent" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-fg">Pro feature</p>
            <p className="max-w-xs text-sm leading-relaxed text-fg-subtle">
              {meta?.label} strategies require a paid plan. Upgrade to write, validate, and deploy {meta?.label} strategies on live bots.
            </p>
          </div>
          <a
            href={UPGRADE_HREF}
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 py-2.5 text-sm font-semibold text-[var(--color-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Star size={15} weight="fill" /> Upgrade to Pro
          </a>
          <p className="text-xs text-fg-faint">JavaScript stays free for everyone.</p>
        </div>
      ) : (
        <>
          {/* Per-language help note */}
          {meta && (
            <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-line bg-surface/40 px-3 py-2 text-xs leading-relaxed text-fg-muted">
              <Info size={15} weight="fill" className="mt-px shrink-0 text-fg-subtle" />
              <span>{LANGUAGE_REFERENCE[language]}</span>
            </div>
          )}

          {/* Editor */}
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-base">
            <div className="flex items-center justify-between border-b border-line bg-surface/50 px-3 py-2">
              <span className="flex items-center gap-2 text-xs font-medium text-fg-subtle">
                <Lightning size={13} weight="fill" className="text-accent" />
                strategy.{fileExt}
              </span>
              <div className="flex items-center gap-1">
                <Tooltip asChild content="Insert snippet">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSnippets((s) => !s)}
                      className="inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                    >
                      <TextAlignLeft size={13} /> Snippets <CaretDown size={10} className={cn("transition-transform", showSnippets && "rotate-180")} />
                    </button>
                    {showSnippets && snippets.length > 0 && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-lg)]">
                        {snippets.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => insertSnippet(s.code)}
                            className="w-full px-3 py-2.5 text-left text-xs font-medium text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Tooltip>
                {(language === "javascript" || language === "python") && (
                  <Tooltip asChild content="Format code (tabs to spaces, trim whitespace)">
                    <button
                      type="button"
                      onClick={formatCode}
                      className="inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                    >
                      <MagicWand size={13} /> Format
                    </button>
                  </Tooltip>
                )}
                <Tooltip asChild content="Copy code">
                  <button
                    type="button"
                    onClick={copyCode}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                  >
                    <Copy size={13} /> Copy
                  </button>
                </Tooltip>
                <button
                  type="button"
                  onClick={resetTemplate}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                >
                  <ArrowCounterClockwise size={13} /> Reset
                </button>
              </div>
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
              {validating ? "Running..." : "Validate & test run"}
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
                <div className="mt-3 space-y-3 text-xs text-fg-muted">
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

                  {/* Transpile preview: mapping, summary, warnings */}
                  {((result.mapping && result.mapping.length > 0) ||
                    (result.warnings && result.warnings.length > 0) ||
                    result.summary) && (
                    <div className="mt-3 space-y-3 rounded-[var(--radius-control)] border border-line bg-surface/50 p-3">
                      {/* Mapping */}
                      {result.mapping && result.mapping.length > 0 && (
                        <div>
                          <p className="mb-1.5 flex items-center gap-1.5 font-medium text-fg">
                            <ArrowsOut size={13} /> Indicator mapping
                          </p>
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-left text-fg-faint">
                                <th className="pb-1 pr-4 font-medium">Source</th>
                                <th className="pb-1 font-medium">Engine indicator</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.mapping.map((m) => (
                                <tr key={m.source}>
                                  <td className="py-px pr-4 font-mono text-fg-subtle">{m.source}</td>
                                  <td className="py-px font-mono text-accent">{m.resolvesTo}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Summary */}
                      {result.summary && (result.summary.long || result.summary.short) && (
                        <div>
                          <p className="mb-1 font-medium text-fg">Entry logic</p>
                          {result.summary.long && (
                            <p className="font-mono text-[11px] text-profit/90">
                              <span className="mr-1.5 font-sans text-fg-faint">LONG:</span>
                              {result.summary.long}
                            </p>
                          )}
                          {result.summary.short && (
                            <p className="font-mono text-[11px] text-negative/90">
                              <span className="mr-1.5 font-sans text-fg-faint">SHORT:</span>
                              {result.summary.short}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Warnings */}
                      {result.warnings && result.warnings.length > 0 && (
                        <div className="space-y-1">
                          {result.warnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-warning">
                              <Warning size={12} weight="fill" className="mt-px shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {result.logs && result.logs.length > 0 && (
                    <pre className="overflow-x-auto rounded-[var(--radius-control)] border border-line bg-base p-2 font-mono text-[11px] text-fg-subtle">
                      {result.logs.join("\n")}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
