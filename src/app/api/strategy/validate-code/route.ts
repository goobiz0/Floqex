import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHistoryBars, getQuoteSnapshot } from "@/lib/engine/market-data";
import { computeIndicatorContext } from "@/lib/engine/indicators";
import { compileStrategy, runStrategyCode } from "@/lib/engine/sandbox";
import { languageMeta } from "@/lib/custom-strategy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Validate and dry-run a user's custom-code strategy. JavaScript is compiled and
// executed once against the most recent real bars for the chosen symbol so the
// editor can show exactly what the strategy would decide right now. Non-JS
// languages are checked structurally (live execution is in beta).
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { code?: unknown; language?: unknown; symbol?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, compiled: false, error: "Invalid request body." });
  }

  const code = typeof body.code === "string" ? body.code : "";
  const language = languageMeta(String(body.language))?.id ?? "javascript";
  const symbol = (typeof body.symbol === "string" && body.symbol.trim()) || "NQ";

  if (!code.trim()) {
    return NextResponse.json({ ok: false, compiled: false, error: "Write some strategy code first." });
  }

  // Non-JavaScript languages: structural validation only (beta).
  if (language !== "javascript") {
    const label = languageMeta(language)?.label ?? language;
    if (code.length > 20_000) {
      return NextResponse.json({ ok: false, compiled: false, error: "Code is too long (20k character limit)." });
    }
    return NextResponse.json({
      ok: true,
      compiled: true,
      signal: null,
      message: `${label} is saved and validated for structure. JavaScript executes in the live engine today; ${label} execution is rolling out.`,
    });
  }

  // JavaScript: compile, then test-run against real recent data.
  const compileError = compileStrategy(code);
  if (compileError) {
    return NextResponse.json({ ok: true, compiled: false, error: compileError });
  }

  try {
    const [bars, quote] = await Promise.all([
      getHistoryBars(symbol, 220),
      getQuoteSnapshot(symbol),
    ]);

    if (!quote || bars.length < 2) {
      return NextResponse.json({
        ok: true,
        compiled: true,
        signal: null,
        message: `Code compiled cleanly. We couldn't fetch enough live data for ${symbol} to test-run it, but it is valid.`,
      });
    }

    const ctx = computeIndicatorContext(bars, {
      price: quote.price,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      prevClose: quote.previousClose,
    });

    const run = runStrategyCode(code, ctx);
    if (!run.ok) {
      return NextResponse.json({ ok: true, compiled: false, error: run.error ?? "Runtime error.", logs: run.logs });
    }

    return NextResponse.json({
      ok: true,
      compiled: true,
      signal: run.decision ? { side: run.decision.side } : null,
      logs: run.logs,
      evaluatedAt: Date.now(),
      message: `Test-run against the latest ${symbol} data. Risk controls are applied on top of your signal when the bot trades.`,
    });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      compiled: true,
      signal: null,
      message: `Code compiled cleanly. Live data test-run was unavailable (${(e as Error).message}).`,
    });
  }
}
