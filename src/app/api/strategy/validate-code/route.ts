import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHistoryBars, getQuoteSnapshot } from "@/lib/engine/market-data";
import { computeIndicatorContext } from "@/lib/engine/indicators";
import { transpileStrategy } from "@/lib/engine/transpile";
import { languageMeta, type StrategyLanguage } from "@/lib/custom-strategy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Validate and dry-run a user's custom-code strategy. All languages (JavaScript,
// Python, Pine Script, TradingView) are transpiled and executed against the most
// recent real bars for the chosen symbol so the editor can show exactly what the
// strategy would decide right now.
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
  const language = (languageMeta(String(body.language))?.id ?? "javascript") as StrategyLanguage;
  const symbol = (typeof body.symbol === "string" && body.symbol.trim()) || "NQ";

  if (!code.trim()) {
    return NextResponse.json({ ok: false, compiled: false, error: "Write some strategy code first." });
  }

  // Transpile to validate and get a run function + metadata.
  const transpileResult = transpileStrategy(language, code);
  if (!transpileResult.ok) {
    return NextResponse.json({ ok: true, compiled: false, error: transpileResult.error });
  }

  const { run, mapping, warnings, summary } = transpileResult;

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
        mapping,
        warnings,
        summary,
        message: `Code compiled cleanly. We couldn't fetch enough live data for ${symbol} to test-run it, but it is valid.`,
      });
    }

    const ctx = computeIndicatorContext(bars, {
      price: quote.price,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      prevClose: quote.previousClose,
    });

    let decision;
    try {
      decision = run(ctx);
    } catch (e) {
      return NextResponse.json({
        ok: true,
        compiled: false,
        error: `Runtime error: ${(e as Error).message}`,
        mapping,
        warnings,
        summary,
      });
    }

    const label = languageMeta(language)?.label ?? language;
    return NextResponse.json({
      ok: true,
      compiled: true,
      signal: decision ? { side: decision.side } : null,
      mapping,
      warnings,
      summary,
      evaluatedAt: Date.now(),
      message: `Test-run against the latest ${symbol} data (${label}). Risk controls are applied on top of your signal when the bot trades.`,
    });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      compiled: true,
      signal: null,
      mapping,
      warnings,
      summary,
      message: `Code compiled cleanly. Live data test-run was unavailable (${(e as Error).message}).`,
    });
  }
}
