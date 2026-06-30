// Pure transpiler: converts Python, Pine Script, and TradingView strategies
// into executable JavaScript that runs inside the sandbox. JavaScript passes
// through to the existing sandbox directly.
//
// Supported subset is deliberately bounded and documented so users get precise
// errors rather than silent failures.

import { compileStrategy, runStrategyCode, staticGuard } from "./sandbox";
import type { StrategyDecision } from "./sandbox";
import type { IndicatorContext } from "./indicators";
import type { StrategyLanguage } from "../custom-strategy";

export type Mapping = { source: string; resolvesTo: string };

export type TranspileResult =
  | {
      ok: true;
      run: (ctx: IndicatorContext) => StrategyDecision;
      mapping: Mapping[];
      warnings: string[];
      summary: { long?: string; short?: string };
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function transpileStrategy(language: StrategyLanguage, code: string): TranspileResult {
  switch (language) {
    case "javascript":
      return transpileJs(code);
    case "python":
      return transpilePython(code);
    case "pinescript":
    case "tradingview":
      return transpilePine(code);
    default: {
      // TypeScript exhaustiveness
      const _: never = language;
      void _;
      return { ok: false, error: `Unknown language: ${language as string}` };
    }
  }
}

export function runTranspiled(
  language: StrategyLanguage,
  code: string,
  ctx: IndicatorContext,
): StrategyDecision {
  const result = transpileStrategy(language, code);
  if (!result.ok) return null;
  try {
    return result.run(ctx);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// JavaScript passthrough
// ---------------------------------------------------------------------------

function transpileJs(code: string): TranspileResult {
  const err = compileStrategy(code);
  if (err) return { ok: false, error: err };
  return {
    ok: true,
    run: (ctx) => runStrategyCode(code, ctx).decision,
    mapping: [],
    warnings: [],
    summary: { long: "executes directly as JavaScript" },
  };
}

// ---------------------------------------------------------------------------
// Python -> JS converter
// ---------------------------------------------------------------------------

const PY_UNSUPPORTED = [
  { re: /f["']/, label: "f-string" },
  { re: /\bimport\b/, label: "import statement" },
  { re: /\[.+\s+for\s+\w+\s+in\b/, label: "list comprehension" },
  { re: /\{.+\s+for\s+\w+\s+in\b/, label: "dict/set comprehension" },
  { re: /\blambda\b/, label: "lambda expression" },
  { re: /\bclass\b/, label: "class definition" },
  { re: /\basync\b|\bawait\b/, label: "async/await" },
  { re: /\bwith\b\s/, label: "with statement" },
  { re: /\byield\b/, label: "yield statement" },
  { re: /\bexcept\b/, label: "try/except" },
  { re: /\btry\b\s*:/, label: "try/except" },
  { re: /\bfor\b\s+\w+\s+in\b/, label: "for loop" },
  { re: /\bwhile\b/, label: "while loop" },
  { re: /\bprint\s*\(/, label: "print() call (use return value instead)" },
];

export function pythonToJs(pyCode: string): { ok: true; js: string } | { ok: false; error: string } {
  const lines = pyCode.split("\n");

  // Check for unsupported constructs line by line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    for (const { re, label } of PY_UNSUPPORTED) {
      if (re.test(trimmed)) {
        return { ok: false, error: `Unsupported Python construct: ${label}. See the supported subset.` };
      }
    }
  }

  // Convert line by line with an indent stack
  const result: string[] = [];
  const indentStack: number[] = [0];

  // Pre-compute indent levels for each non-empty line to know what the next
  // indent level will be (used for block opening).
  const nonEmptyLines: { raw: string; indent: number; content: string }[] = [];
  for (const raw of lines) {
    if (raw.trim() === "") {
      nonEmptyLines.push({ raw, indent: -1, content: "" });
      continue;
    }
    const m = raw.match(/^(\s*)/);
    const indent = m ? m[1].replace(/\t/g, "  ").length : 0;
    const content = raw.trim();
    nonEmptyLines.push({ raw, indent, content });
  }

  for (let i = 0; i < nonEmptyLines.length; i++) {
    const { indent, content } = nonEmptyLines[i];
    // Preserve empty lines
    if (indent === -1) {
      result.push("");
      continue;
    }

    // Skip pure comment lines
    if (content.startsWith("#")) {
      const jsComment = content.replace(/^#\s?/, "// ");
      result.push(" ".repeat(indent) + jsComment);
      continue;
    }

    const curIndent = indentStack[indentStack.length - 1];

    // Dedent: close braces for each level we came back
    if (indent < curIndent) {
      while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) {
        indentStack.pop();
        const closeIndent = " ".repeat(indentStack[indentStack.length - 1]);
        result.push(`${closeIndent}}`);
      }
    }

    // Convert the content
    let jsLine = convertPyLine(content);

    // If line ends with colon (block start), open brace
    if (jsLine.trimEnd().endsWith(":")) {
      jsLine = jsLine.trimEnd().slice(0, -1) + " {";
      // Find the actual next non-empty line's indent to know the inner block level
      let nextIndent = indent + 4; // fallback
      for (let j = i + 1; j < nonEmptyLines.length; j++) {
        if (nonEmptyLines[j].indent > indent) {
          nextIndent = nonEmptyLines[j].indent;
          break;
        }
      }
      indentStack.push(nextIndent);
    }

    const jsIndent = " ".repeat(indent);
    // For else/else-if branches: merge the closing } from the previous block with
    // this else keyword to produce "} else {" on a single line.
    const isElseBranch = /^else(\s|$)/.test(jsLine.trimStart());
    if (isElseBranch && result.length > 0 && result[result.length - 1].trimEnd() === `${jsIndent}}`) {
      result[result.length - 1] = `${jsIndent}} ${jsLine.trimStart()}`;
    } else {
      result.push(`${jsIndent}${jsLine}`);
    }
  }

  // Close any remaining open braces
  while (indentStack.length > 1) {
    indentStack.pop();
    const closeIndent = " ".repeat(indentStack[indentStack.length - 1]);
    result.push(`${closeIndent}}`);
  }

  return { ok: true, js: result.join("\n") };
}

function convertPyLine(line: string): string {
  // def decide(ctx): -> function decide(ctx):
  // (block-detection in the outer loop will convert the trailing : to { and push indent)
  if (/^def\s+decide\s*\(ctx\)\s*:/.test(line)) {
    return "function decide(ctx):";
  }

  // Keywords and operators
  let s = line;

  // elif -> else if (must come before if replacement to avoid double replacement)
  s = s.replace(/\belif\b/g, "else if");

  // else: -> else {  (handled by block detection, just strip colon)
  // if/while conditions: add parens if missing
  s = s.replace(/\bif\s+(?!\()(.+?)(\s*):$/, "if ($1):");
  s = s.replace(/\belse if\s+(?!\()(.+?)(\s*):$/, "else if ($1):");

  // Literals
  s = s.replace(/\bTrue\b/g, "true");
  s = s.replace(/\bFalse\b/g, "false");
  s = s.replace(/\bNone\b/g, "null");

  // Operators: order matters
  s = s.replace(/\bis\s+not\s+None\b/g, "!== null");
  s = s.replace(/\bis\s+None\b/g, "=== null");
  s = s.replace(/\bis\s+not\b/g, "!==");
  s = s.replace(/\bis\b/g, "===");
  s = s.replace(/\band\b/g, "&&");
  s = s.replace(/\bor\b/g, "||");
  s = s.replace(/\bnot\b\s+/g, "!");

  // ctx.get("x") -> ctx["x"]
  s = s.replace(/ctx\.get\(\s*["'](\w+)["']\s*\)/g, 'ctx["$1"]');

  // Comments
  s = s.replace(/\s*#\s*(.*)$/, " // $1");

  // Return dict literal: return {"side": "LONG"} is already valid JS
  // Dict literals with Python-style True/False/None were already replaced above

  return s;
}

function transpilePython(code: string): TranspileResult {
  const conv = pythonToJs(code);
  if (!conv.ok) return { ok: false, error: (conv as any).error };

  const js = conv.js;
  const guard = staticGuard(js);
  if (guard) return { ok: false, error: `Static guard: ${guard}` };

  const compileErr = compileStrategy(js);
  if (compileErr) return { ok: false, error: `Transpile produced invalid JavaScript: ${compileErr}` };

  return {
    ok: true,
    run: (ctx) => runStrategyCode(js, ctx).decision,
    mapping: [],
    warnings: [],
    summary: { long: "Python decide() transpiled to JavaScript" },
  };
}

// ---------------------------------------------------------------------------
// Pine Script / TradingView parser
// ---------------------------------------------------------------------------

// Indicator alias table: Pine token -> IndicatorContext key (or special)
const PINE_ALIAS: Record<string, string> = {
  close: "price",
  price: "price",
  high: "dayHigh",
  low: "dayLow",
  volume: "volume",
};

// ta.sma periods
const SMA_MAP: Record<number, string> = { 20: "sma20", 50: "sma50", 200: "sma200" };
const EMA_MAP: Record<number, string> = { 12: "ema12", 26: "ema26" };

// Token types for the Pratt parser
type TokenType =
  | "NUMBER"
  | "IDENT"
  | "OP"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "DOT"
  | "EOF";

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1] ?? ""))) {
      let num = "";
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === ".")) num += expr[i++];
      tokens.push({ type: "NUMBER", value: num, pos: i - num.length });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) ident += expr[i++];
      tokens.push({ type: "IDENT", value: ident, pos: i - ident.length });
      continue;
    }
    if (ch === "(") { tokens.push({ type: "LPAREN", value: "(", pos: i++ }); continue; }
    if (ch === ")") { tokens.push({ type: "RPAREN", value: ")", pos: i++ }); continue; }
    if (ch === ",") { tokens.push({ type: "COMMA", value: ",", pos: i++ }); continue; }
    if (ch === ".") { tokens.push({ type: "DOT", value: ".", pos: i++ }); continue; }
    // Multi-char operators
    if (expr.slice(i, i + 2) === ">=" || expr.slice(i, i + 2) === "<=" ||
        expr.slice(i, i + 2) === "==" || expr.slice(i, i + 2) === "!=") {
      tokens.push({ type: "OP", value: expr.slice(i, i + 2), pos: i });
      i += 2;
      continue;
    }
    if ("+-*/<>!".includes(ch)) { tokens.push({ type: "OP", value: ch, pos: i++ }); continue; }
    i++;
  }
  tokens.push({ type: "EOF", value: "", pos: i });
  return tokens;
}

type AstNode =
  | { kind: "num"; value: number }
  | { kind: "ctx"; key: string }
  | { kind: "hl2" }
  | { kind: "binop"; op: string; left: AstNode; right: AstNode }
  | { kind: "unop"; op: string; operand: AstNode }
  | { kind: "null" };

interface ParseState {
  tokens: Token[];
  pos: number;
}

function peek(s: ParseState): Token { return s.tokens[s.pos]; }
function consume(s: ParseState): Token { return s.tokens[s.pos++]; }

function parseExpr(s: ParseState, minPrec = 0): { node: AstNode; mapping: Mapping[]; warnings: string[] } {
  const mapping: Mapping[] = [];
  const warnings: string[] = [];

  function parseAtom(): AstNode {
    const tok = peek(s);
    if (tok.type === "NUMBER") {
      consume(s);
      return { kind: "num", value: parseFloat(tok.value) };
    }
    if (tok.type === "LPAREN") {
      consume(s);
      const inner = parsePrec(0);
      if (peek(s).type === "RPAREN") consume(s);
      return inner;
    }
    if (tok.type === "OP" && tok.value === "!") {
      consume(s);
      const operand = parseAtom();
      return { kind: "unop", op: "!", operand };
    }
    if (tok.type === "OP" && tok.value === "-") {
      consume(s);
      const operand = parseAtom();
      return { kind: "binop", op: "*", left: { kind: "num", value: -1 }, right: operand };
    }
    if (tok.type === "IDENT") {
      consume(s);
      const name = tok.value;

      // Handle qualified names: ta.xxx or strategy.xxx
      if (peek(s).type === "DOT") {
        consume(s); // consume dot
        const method = consume(s).value; // e.g. sma, ema, rsi, atr, macd, crossover, crossunder, long, short

        if (name === "ta") {
          if (method === "sma") {
            // ta.sma(close, period)
            consume(s); // (
            const _src = parsePrec(0); // close
            if (peek(s).type === "COMMA") consume(s);
            const periodTok = peek(s);
            const period = periodTok.type === "NUMBER" ? parseInt(periodTok.value, 10) : 0;
            consume(s); // period
            if (peek(s).type === "RPAREN") consume(s);
            const ctxKey = SMA_MAP[period];
            if (!ctxKey) {
              return { kind: "null" }; // will be treated as error via callers
            }
            mapping.push({ source: `ta.sma(close,${period})`, resolvesTo: ctxKey });
            return { kind: "ctx", key: ctxKey };
          }
          if (method === "ema") {
            consume(s);
            const _src = parsePrec(0);
            if (peek(s).type === "COMMA") consume(s);
            const periodTok = peek(s);
            const period = periodTok.type === "NUMBER" ? parseInt(periodTok.value, 10) : 0;
            consume(s);
            if (peek(s).type === "RPAREN") consume(s);
            const ctxKey = EMA_MAP[period];
            if (!ctxKey) return { kind: "null" };
            mapping.push({ source: `ta.ema(close,${period})`, resolvesTo: ctxKey });
            return { kind: "ctx", key: ctxKey };
          }
          if (method === "rsi") {
            consume(s);
            const _src = parsePrec(0);
            if (peek(s).type === "COMMA") consume(s);
            const periodTok = peek(s);
            const period = periodTok.type === "NUMBER" ? parseInt(periodTok.value, 10) : 14;
            consume(s);
            if (peek(s).type === "RPAREN") consume(s);
            if (period !== 14) warnings.push(`RSI length ${period} approximated by rsi14`);
            mapping.push({ source: `ta.rsi(close,${period})`, resolvesTo: "rsi14" });
            return { kind: "ctx", key: "rsi14" };
          }
          if (method === "atr") {
            consume(s);
            const periodTok = peek(s);
            const period = periodTok.type === "NUMBER" ? parseInt(periodTok.value, 10) : 14;
            consume(s);
            if (peek(s).type === "RPAREN") consume(s);
            if (period !== 14) warnings.push(`ATR length ${period} approximated by atr14`);
            mapping.push({ source: `ta.atr(${period})`, resolvesTo: "atr14" });
            return { kind: "ctx", key: "atr14" };
          }
          if (method === "macd") {
            // consume all args
            consume(s);
            let depth = 1;
            while (depth > 0 && peek(s).type !== "EOF") {
              const t = consume(s);
              if (t.type === "LPAREN") depth++;
              else if (t.type === "RPAREN") depth--;
            }
            warnings.push("ta.macd() mapped to MACD line only (signal/histogram not modelled)");
            mapping.push({ source: "ta.macd(...)", resolvesTo: "macd" });
            return { kind: "ctx", key: "macd" };
          }
          if (method === "crossover") {
            consume(s);
            const left = parsePrec(0);
            if (peek(s).type === "COMMA") consume(s);
            const right = parsePrec(0);
            if (peek(s).type === "RPAREN") consume(s);
            warnings.push("ta.crossover() approximated as current-tick a > b");
            return { kind: "binop", op: ">", left, right };
          }
          if (method === "crossunder") {
            consume(s);
            const left = parsePrec(0);
            if (peek(s).type === "COMMA") consume(s);
            const right = parsePrec(0);
            if (peek(s).type === "RPAREN") consume(s);
            warnings.push("ta.crossunder() approximated as current-tick a < b");
            return { kind: "binop", op: "<", left, right };
          }
        }

        if (name === "strategy" || name === "indicator") {
          // Ignore strategy.long, strategy.short (used as constants), strategy.entry etc.
          // They are terminal references consumed by the outer block parser
          return { kind: "null" };
        }

        // Unknown qualified name - treat as null
        return { kind: "null" };
      }

      // Simple identifier lookup
      if (name === "hl2") {
        mapping.push({ source: "hl2", resolvesTo: "(dayHigh+dayLow)/2" });
        return { kind: "hl2" };
      }
      if (name === "open") {
        // open is unsupported
        return { kind: "null" };
      }
      if (name in PINE_ALIAS) {
        const key = PINE_ALIAS[name];
        mapping.push({ source: name, resolvesTo: key });
        return { kind: "ctx", key };
      }
      // Could be a variable reference - return as null (variable substitution happens before parsing)
      return { kind: "null" };
    }
    return { kind: "null" };
  }

  const PREC: Record<string, number> = {
    "||": 1, "or": 1,
    "&&": 2, "and": 2,
    "==": 3, "!=": 3,
    "<": 4, ">": 4, "<=": 4, ">=": 4,
    "+": 5, "-": 5,
    "*": 6, "/": 6,
  };

  function parsePrec(prec: number): AstNode {
    // Handle 'not' keyword as unary
    if (peek(s).type === "IDENT" && peek(s).value === "not") {
      consume(s);
      const operand = parsePrec(7);
      return { kind: "unop", op: "!", operand };
    }

    let left = parseAtom();

    while (true) {
      const t = peek(s);
      let op: string | null = null;

      if (t.type === "OP") {
        op = t.value;
      } else if (t.type === "IDENT" && (t.value === "and" || t.value === "or")) {
        op = t.value;
      }

      if (!op || !(op in PREC) || PREC[op] <= prec) break;

      consume(s);
      const right = parsePrec(PREC[op]);
      left = { kind: "binop", op, left, right };
    }

    return left;
  }

  const node = parsePrec(minPrec);
  return { node, mapping, warnings };
}

function evalNode(node: AstNode, ctx: IndicatorContext): number | boolean | null {
  switch (node.kind) {
    case "num":
      return node.value;
    case "null":
      return null;
    case "hl2":
      return (ctx.dayHigh + ctx.dayLow) / 2;
    case "ctx": {
      const val = (ctx as unknown as Record<string, number | null>)[node.key];
      return typeof val === "number" && Number.isFinite(val) ? val : null;
    }
    case "unop": {
      const v = evalNode(node.operand, ctx);
      if (node.op === "!") return !v;
      return null;
    }
    case "binop": {
      const l = evalNode(node.left, ctx);
      const r = evalNode(node.right, ctx);

      if (node.op === "and" || node.op === "&&") return Boolean(l) && Boolean(r);
      if (node.op === "or" || node.op === "||") return Boolean(l) || Boolean(r);

      // For comparisons, null operand -> false
      if (l === null || r === null) return false;
      const ln = Number(l);
      const rn = Number(r);
      switch (node.op) {
        case ">": return ln > rn;
        case "<": return ln < rn;
        case ">=": return ln >= rn;
        case "<=": return ln <= rn;
        case "==": return ln === rn;
        case "!=": return ln !== rn;
        case "+": return ln + rn;
        case "-": return ln - rn;
        case "*": return ln * rn;
        case "/": return rn !== 0 ? ln / rn : null;
      }
      return null;
    }
  }
}

// Validate ta.sma/ema calls return valid keys (not null node from unsupported period)
function validatePineExpr(expr: string): { ok: false; error: string } | { ok: true } {
  // Check for unsupported ta.sma/ema periods
  const smaPeriodRe = /ta\.sma\s*\(\s*\w+\s*,\s*(\d+)\s*\)/g;
  let m;
  while ((m = smaPeriodRe.exec(expr)) !== null) {
    const period = parseInt(m[1], 10);
    if (!SMA_MAP[period]) {
      return { ok: false, error: `ta.sma period ${period} is not supported. Use 20, 50, or 200.` };
    }
  }
  const emaPeriodRe = /ta\.ema\s*\(\s*\w+\s*,\s*(\d+)\s*\)/g;
  while ((m = emaPeriodRe.exec(expr)) !== null) {
    const period = parseInt(m[1], 10);
    if (!EMA_MAP[period]) {
      return { ok: false, error: `ta.ema period ${period} is not supported. Use 12 or 26.` };
    }
  }
  if (/\bopen\b/.test(expr)) {
    return { ok: false, error: "`open` is not supported in the engine. Use `close` (price), `high`, or `low`." };
  }
  return { ok: true };
}

interface PineParseResult {
  longExpr?: string;
  shortExpr?: string;
  mapping: Mapping[];
  warnings: string[];
}

function parsePine(code: string): { ok: false; error: string } | { ok: true; result: PineParseResult } {
  // Step 1: Strip //@version and comments
  const lines = code
    .split("\n")
    .map((l) => l.replace(/\/\/@version.*/, "").replace(/\/\/.*/, "").trim())
    .filter((l) => l.length > 0);

  // Step 2: Resolve simple variable assignments (var = expr)
  // Also handles: longCondition = ..., shortCondition = ...
  const vars: Record<string, string> = {};
  const filteredLines: string[] = [];

  for (const line of lines) {
    // Skip strategy(), indicator(), plot() noise
    if (/^(strategy|indicator|plot|plotshape|alertcondition|bgcolor|barcolor)\s*\(/.test(line)) {
      continue;
    }

    // Variable assignment: name = expr (not == or :=)
    const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*(?::)?=(?!=)\s*(.+)$/);
    if (assignMatch) {
      const varName = assignMatch[1];
      let expr = assignMatch[2].trim();
      // Substitute known variables in the expression
      for (const [k, v] of Object.entries(vars)) {
        expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), `(${v})`);
      }
      vars[varName] = expr;
      // longCondition / shortCondition are collected here
      filteredLines.push(line);
      continue;
    }

    filteredLines.push(line);
  }

  // Substitute variables in all lines
  const resolvedLines = filteredLines.map((line) => {
    let resolved = line;
    for (const [k, v] of Object.entries(vars)) {
      resolved = resolved.replace(new RegExp(`\\b${k}\\b`, "g"), `(${v})`);
    }
    return resolved;
  });

  // Step 3: Extract long/short conditions
  let longExpr: string | undefined;
  let shortExpr: string | undefined;

  // Priority 1: longCondition / shortCondition variables
  if (vars["longCondition"]) longExpr = vars["longCondition"];
  if (vars["shortCondition"]) shortExpr = vars["shortCondition"];

  // Priority 2: strategy.entry calls
  if (!longExpr || !shortExpr) {
    for (const line of resolvedLines) {
      // strategy.entry("id", strategy.long, when = expr)
      const entryWhenMatch = line.match(/strategy\.entry\s*\([^,]+,\s*strategy\.(long|short)\s*,\s*when\s*=\s*(.+)\)/i);
      if (entryWhenMatch) {
        const dir = entryWhenMatch[1].toLowerCase();
        const expr = entryWhenMatch[2].trim();
        if (dir === "long" && !longExpr) longExpr = expr;
        else if (dir === "short" && !shortExpr) shortExpr = expr;
      }
    }
  }

  // Priority 3: if (expr) strategy.entry(... strategy.long|short)
  if (!longExpr || !shortExpr) {
    for (let i = 0; i < resolvedLines.length; i++) {
      const line = resolvedLines[i];
      const ifMatch = line.match(/^if\s*\((.+)\)\s*$/);
      if (!ifMatch) {
        const ifInline = line.match(/^if\s+(.+?)\s*$/);
        if (ifInline) {
          const cond = ifInline[1].trim();
          // Check next lines for strategy.entry
          const nextLine = resolvedLines[i + 1] ?? "";
          const longEntry = nextLine.match(/strategy\.(entry|long)/i);
          const shortEntry = nextLine.match(/strategy\.(entry.*short|short)/i);
          if (longEntry && !shortEntry && !longExpr) longExpr = cond;
          else if (shortEntry && !longExpr) shortExpr = cond;
        }
        continue;
      }
      const cond = ifMatch[1].trim();
      // Look at next line for strategy call
      const nextLine = resolvedLines[i + 1] ?? "";
      if (/strategy\.(entry|long)\b/i.test(nextLine) && !/strategy\.(entry.*short|short)\b/i.test(nextLine)) {
        if (!longExpr) longExpr = cond;
      } else if (/strategy\.(short|entry.*short)\b/i.test(nextLine)) {
        if (!shortExpr) shortExpr = cond;
      }
    }
  }

  if (!longExpr && !shortExpr) {
    return {
      ok: false,
      error:
        "Could not find entry conditions. Define longCondition/shortCondition variables, use strategy.entry(id, strategy.long, when=expr), or use an if block followed by strategy.entry.",
    };
  }

  // Validate expressions
  for (const expr of [longExpr, shortExpr].filter(Boolean) as string[]) {
    const v = validatePineExpr(expr);
    if (!v.ok) return { ok: false, error: (v as any).error };
  }

  // Parse both expressions to collect mapping/warnings
  const allMapping: Mapping[] = [];
  const allWarnings: string[] = [];

  for (const expr of [longExpr, shortExpr].filter(Boolean) as string[]) {
    const tokens = tokenize(expr);
    const state: ParseState = { tokens, pos: 0 };
    const { mapping, warnings } = parseExpr(state, 0);
    for (const m of mapping) {
      if (!allMapping.some((x) => x.source === m.source)) allMapping.push(m);
    }
    for (const w of warnings) {
      if (!allWarnings.includes(w)) allWarnings.push(w);
    }
  }

  return {
    ok: true,
    result: {
      longExpr,
      shortExpr,
      mapping: allMapping,
      warnings: allWarnings,
    },
  };
}

function makeConditionEvaluator(expr: string): (ctx: IndicatorContext) => boolean {
  return (ctx: IndicatorContext) => {
    const tokens = tokenize(expr);
    const state: ParseState = { tokens, pos: 0 };
    const { node } = parseExpr(state, 0);
    const val = evalNode(node, ctx);
    return Boolean(val);
  };
}

function transpilePine(code: string): TranspileResult {
  const parsed = parsePine(code);
  if (!parsed.ok) return { ok: false, error: (parsed as any).error };

  const { longExpr, shortExpr, mapping, warnings } = parsed.result;

  const longFn = longExpr ? makeConditionEvaluator(longExpr) : null;
  const shortFn = shortExpr ? makeConditionEvaluator(shortExpr) : null;

  const summary: { long?: string; short?: string } = {};
  if (longExpr) summary.long = longExpr;
  if (shortExpr) summary.short = shortExpr;

  return {
    ok: true,
    run: (ctx: IndicatorContext): StrategyDecision => {
      if (longFn && longFn(ctx)) return { side: "LONG" };
      if (shortFn && shortFn(ctx)) return { side: "SHORT" };
      return null;
    },
    mapping,
    warnings,
    summary,
  };
}
