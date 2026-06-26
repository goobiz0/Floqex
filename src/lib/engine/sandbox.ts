// Safe-ish evaluator for user-authored JavaScript strategies. A user writes a
// small `decide(ctx)` function (or a top-level `return`) that inspects the live
// indicator context and returns a decision. We execute it with the dangerous
// host globals shadowed to `undefined`, in strict mode, behind a static guard
// that rejects obvious escape/abuse patterns.
//
// Threat model: this runs a user's OWN code on their OWN bot, not untrusted
// third-party code. The guards below stop accidents and casual escapes (network
// calls, infinite loops, prototype-chain reach-arounds); a hardened deployment
// would additionally run this inside an isolate/worker with a CPU deadline.

import type { IndicatorContext } from "./indicators";

export type StrategyDecision = {
  side: "LONG" | "SHORT";
  /** Optional per-signal overrides; fall back to the strategy's risk settings. */
  stopLossPct?: number;
  targetRatio?: number;
} | null;

export type RunResult = {
  ok: boolean;
  decision: StrategyDecision;
  logs: string[];
  error?: string;
};

// Globals shadowed (set to undefined) inside the user's scope. Note: `eval`,
// `import` and `arguments` cannot be used as parameter names in a strict-mode
// function, so those are handled by the static guard below instead.
const BLOCKED_GLOBALS = [
  "window", "self", "globalThis", "global", "process", "require", "module",
  "exports", "fetch", "XMLHttpRequest", "WebSocket", "Function",
  "setTimeout", "setInterval", "setImmediate", "queueMicrotask", "Deno",
  "Bun", "__dirname", "__filename", "Buffer",
];

// Static patterns we refuse to even compile. Catches the common sandbox-escape
// and resource-abuse idioms before any execution.
const FORBIDDEN_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bconstructor\b/, reason: "access to `constructor` is not allowed" },
  { re: /\b__proto__\b/, reason: "access to `__proto__` is not allowed" },
  { re: /\bprototype\b/, reason: "access to `prototype` is not allowed" },
  { re: /\b(require|import)\s*\(/, reason: "imports are not allowed" },
  { re: /\bimport\b/, reason: "imports are not allowed" },
  { re: /\beval\b/, reason: "eval is not allowed" },
  { re: /\bprocess\b/, reason: "access to `process` is not allowed" },
  { re: /\bwhile\s*\(\s*true\s*\)/, reason: "infinite loops are not allowed" },
  { re: /\bfor\s*\(\s*;\s*;\s*\)/, reason: "infinite loops are not allowed" },
];

/** Reject code containing forbidden tokens. Returns an error string or null. */
export function staticGuard(code: string): string | null {
  for (const { re, reason } of FORBIDDEN_PATTERNS) {
    if (re.test(code)) return `Blocked: ${reason}.`;
  }
  if (code.length > 20_000) return "Strategy code is too long (20k character limit).";
  return null;
}

/** Coerce a user return value into a normalised decision (or null = stay flat). */
export function normalizeDecision(raw: unknown): StrategyDecision {
  if (raw == null || raw === false) return null;
  if (raw === true || raw === "LONG" || raw === "long") return { side: "LONG" };
  if (raw === "SHORT" || raw === "short") return { side: "SHORT" };
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const sideRaw = typeof o.side === "string" ? o.side.toUpperCase() : null;
    if (sideRaw !== "LONG" && sideRaw !== "SHORT") return null;
    const decision: StrategyDecision = { side: sideRaw };
    const stop = Number(o.stopLossPct ?? o.stopPct);
    const rr = Number(o.targetRatio ?? o.rr);
    if (Number.isFinite(stop) && stop > 0) decision.stopLossPct = stop;
    if (Number.isFinite(rr) && rr > 0) decision.targetRatio = rr;
    return decision;
  }
  return null;
}

/** Compile-check the code without running it. Returns an error string or null. */
export function compileStrategy(code: string): string | null {
  const guard = staticGuard(code);
  if (guard) return guard;
  try {
    // Build but do not call. A syntax error throws here.
    makeRunner(code);
    return null;
  } catch (e) {
    return `Syntax error: ${(e as Error).message}`;
  }
}

function makeRunner(code: string): (ctx: IndicatorContext, sink: string[]) => unknown {
  const body =
    `"use strict";\n` +
    `const console = { log: (...a) => __sink__.push(a.map(String).join(" ")) };\n` +
    `${code}\n;\n` +
    `if (typeof decide === "function") { return decide(ctx); }\n` +
    `return null;`;
  const fn = new Function(...BLOCKED_GLOBALS, "ctx", "__sink__", body) as (
    ...args: unknown[]
  ) => unknown;
  return (ctx: IndicatorContext, sink: string[]) =>
    fn(...BLOCKED_GLOBALS.map(() => undefined), ctx, sink);
}

/**
 * Run a user strategy against one indicator context. Never throws: a runtime
 * error is captured and surfaced as `{ ok: false, error }` with a null decision,
 * so the engine simply holds flat on a broken strategy rather than crashing.
 */
export function runStrategyCode(code: string, ctx: IndicatorContext): RunResult {
  const guard = staticGuard(code);
  if (guard) return { ok: false, decision: null, logs: [], error: guard };

  const logs: string[] = [];
  try {
    const runner = makeRunner(code);
    const raw = runner(ctx, logs);
    return { ok: true, decision: normalizeDecision(raw), logs };
  } catch (e) {
    return { ok: false, decision: null, logs, error: (e as Error).message };
  }
}
