import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRealMarketData } from "@/lib/engine/market-data";
import { evaluateOrbStrategy, evaluateCustomStrategy, evaluateExit } from "@/lib/engine/signal-generator";
import { executeTrade, closeTrade } from "@/lib/engine/execution-router";
import { validateRisk } from "@/lib/engine/risk-engine";
import { BrokerNotConfiguredError } from "@/lib/engine/live-broker";
import { recordBotStatus, RISK_REASON_TEXT } from "@/lib/engine/feedback";
import { isInstrumentTradeable, getMarketForInstrument, marketLabel } from "@/lib/market";
import { instrumentsFromParams } from "@/lib/custom-strategy";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const aHash = crypto.createHash("sha256").update(a).digest();
    const bHash = crypto.createHash("sha256").update(b).digest();
    return crypto.timingSafeEqual(aHash, bHash);
  } catch {
    return false;
  }
}

// Stateless engine tick for serverless cron. Mirrors src/worker/engine.ts so
// either entry point (long-running worker OR Vercel/external cron) behaves the
// same: real market data, risk validation, market-hours gating, and honest
// handling when a live broker cannot be reached.
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const rateLimitSuccess = await checkRateLimit(`cron_engine_${ip}`, 60, "1 m");
  if (!rateLimitSuccess) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const authHeader = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  const secretKey = url.searchParams.get("secret") || req.headers.get("x-api-secret") || "";

  const cronSecret = process.env.CRON_SECRET;
  const apiSecret = process.env.API_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!cronSecret && !apiSecret) {
      throw new Error("Both CRON_SECRET and API_SECRET are missing in production");
    }
  }

  const isValidVercel =
    process.env.NODE_ENV === "development" ||
    (cronSecret ? timingSafeEqual(authHeader, `Bearer ${cronSecret}`) : false);

  const isValidCustom =
    apiSecret ? timingSafeEqual(secretKey, apiSecret) : false;

  if (!isValidVercel && !isValidCustom) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bots = await prisma.bot.findMany({
      where: { status: "RUNNING" },
      include: { account: true, strategy: true },
    });

    if (bots.length === 0) {
      return NextResponse.json({ ok: true, message: "No running bots" });
    }

    let processed = 0;
    for (const bot of bots) {
      // Skip bots not attached to an account
      if (!bot.accountId || !bot.account) continue;

      await prisma.bot.update({ where: { id: bot.id }, data: { lastHeartbeat: new Date() } });

      const params = typeof bot.strategy.params === "string" ? JSON.parse(bot.strategy.params) : bot.strategy.params;
      // A bot can trade several instruments. We evaluate each one independently:
      // its own open position, its own market hours, its own entry signal. The
      // per-account risk limits (daily loss, max trades) span all of them.
      const instruments = instrumentsFromParams(params);
      processed++;

      for (const instrument of instruments) {
        const openTrade = await prisma.trade.findFirst({ where: { botId: bot.id, status: "OPEN", instrument } });
        const marketData = await getRealMarketData(instrument);
        if (!marketData) {
          // Be explicit: the bot is running but can't see a price feed for this
          // instrument, so the user knows it isn't silently broken.
          await recordBotStatus({
            botId: bot.id,
            accountId: bot.accountId!,
            kind: "INFO",
            message: `Couldn't fetch a live price for ${instrument} this tick. The bot will keep retrying.`,
            throttleMs: 10 * 60 * 1000,
          });
          continue;
        }

        if (openTrade) {
          const exitSignal = evaluateExit(openTrade, marketData, params);
          if (!exitSignal) continue;
          if (exitSignal.reason === "TRAIL_UPDATE" && exitSignal.newStopPrice) {
            await prisma.trade.update({ where: { id: openTrade.id }, data: { stopPrice: exitSignal.newStopPrice } });
            continue;
          }
          if (exitSignal.exitPrice === undefined) continue;
          const exitPriceNum = Number(exitSignal.exitPrice);
          const pnl = await closeTrade(openTrade.id, bot.accountId!, exitSignal.reason, exitPriceNum);
          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId!,
              kind: "TRADE",
              message: `Closed ${openTrade.direction} on ${instrument} at ${exitPriceNum.toFixed(2)}. Reason: ${exitSignal.reason}. PnL: $${pnl?.toFixed(2)}`,
              tradeId: openTrade.id,
            },
          });
          continue;
        }

        // New entries only while the instrument's market is open.
        if (!isInstrumentTradeable(instrument)) {
          const market = marketLabel(getMarketForInstrument(instrument));
          await recordBotStatus({
            botId: bot.id,
            accountId: bot.accountId!,
            kind: "INFO",
            message: `${market} is closed right now. Holding flat on ${instrument}. The bot will look for entries when the market reopens.`,
            throttleMs: 30 * 60 * 1000,
          });
          continue;
        }

        const entrySignal = bot.strategy.kind === "CUSTOM"
          ? evaluateCustomStrategy(params, marketData, null)
          : evaluateOrbStrategy(params, marketData, null);
        if (!entrySignal) {
          // Alive and scanning — just no qualifying setup yet. Keep the copy static
          // (no live price) so the de-dupe in recordBotStatus can throttle it.
          const detail = bot.strategy.kind === "CUSTOM"
            ? "the strategy conditions haven't all been met yet"
            : "price hasn't pushed to the edge of the day's range yet";
          await recordBotStatus({
            botId: bot.id,
            accountId: bot.accountId!,
            kind: "INFO",
            message: `Scanning ${instrument} for a setup. No entry yet (${detail}). Holding flat.`,
            throttleMs: 15 * 60 * 1000,
          });
          continue;
        }

        const risk = await validateRisk(bot.id, bot.accountId!, entrySignal, params);
        if (!risk.passed) {
          const reason = risk.reason ?? "RISK_BLOCKED";
          await recordBotStatus({
            botId: bot.id,
            accountId: bot.accountId!,
            kind: "RISK",
            message: `Setup found on ${instrument} but the trade was blocked: ${RISK_REASON_TEXT[reason] ?? reason}`,
            throttleMs: 10 * 60 * 1000,
          });
          if (risk.reason === "GLOBAL_HARD_STOP_BALANCE_TOO_LOW") {
            await prisma.bot.update({ where: { id: bot.id }, data: { status: "STOPPED" } });
          }
          continue;
        }

        try {
          const trade = await executeTrade(
            bot.id,
            bot.accountId!,
            entrySignal,
            { sizeUnits: risk.sizeUnits || 0, riskPct: risk.riskPct || 0 },
            instrument,
          );
          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId!,
              kind: "TRADE",
              message: `Executed ${entrySignal.direction} on ${instrument} at ${entrySignal.entryPrice.toFixed(2)}. Size: ${(risk.sizeUnits || 0).toFixed(4)}. Stop: ${entrySignal.stopPrice.toFixed(2)}. Target: ${entrySignal.targetPrice.toFixed(2)}`,
              tradeId: trade.id,
            },
          });
        } catch (e: unknown) {
          const error = e as Error;
          if (error instanceof BrokerNotConfiguredError) {
            await prisma.agentEvent.create({
              data: {
                botId: bot.id,
                accountId: bot.accountId!,
                kind: "RISK",
                message: `Live execution blocked: ${error.message} Bot stopped. Connect a supported broker to trade live.`,
              },
            });
            await prisma.bot.update({ where: { id: bot.id }, data: { status: "STOPPED" } });
          } else {
            console.error(`[CRON] execute failed for bot ${bot.id}`, error);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, processed });
  } catch (error) {
    console.error("Cron engine error", error);
    return NextResponse.json({ error: "Engine execution failed" }, { status: 500 });
  }
}
