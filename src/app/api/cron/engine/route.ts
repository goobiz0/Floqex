import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRealMarketData } from "@/lib/engine/market-data";
import { evaluateOrbStrategy, evaluateCustomStrategy, evaluateExit } from "@/lib/engine/signal-generator";
import { executeTrade, closeTrade } from "@/lib/engine/execution-router";
import { validateRisk } from "@/lib/engine/risk-engine";
import { BrokerNotConfiguredError } from "@/lib/engine/live-broker";
import { isInstrumentTradeable } from "@/lib/market";

export const dynamic = "force-dynamic";

// Stateless engine tick for serverless cron. Mirrors src/worker/engine.ts so
// either entry point (long-running worker OR Vercel/external cron) behaves the
// same: real market data, risk validation, market-hours gating, and honest
// handling when a live broker cannot be reached.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const secretKey = url.searchParams.get("secret") || req.headers.get("x-api-secret");

  const isValidVercel = process.env.NODE_ENV === "development" || authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isValidCustom = secretKey === process.env.API_SECRET;
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
      await prisma.bot.update({ where: { id: bot.id }, data: { lastHeartbeat: new Date() } });

      const params = typeof bot.strategy.params === "string" ? JSON.parse(bot.strategy.params) : bot.strategy.params;
      const instrument = params.instrument || "NQ";

      const openTrade = await prisma.trade.findFirst({ where: { botId: bot.id, status: "OPEN" } });
      const marketData = await getRealMarketData(instrument);
      if (!marketData) continue;
      processed++;

      if (openTrade) {
        const exitSignal = evaluateExit(openTrade, marketData, params);
        if (!exitSignal) continue;
        if (exitSignal.reason === "TRAIL_UPDATE" && exitSignal.newStopPrice) {
          await prisma.trade.update({ where: { id: openTrade.id }, data: { stopPrice: exitSignal.newStopPrice } });
          continue;
        }
        if (exitSignal.exitPrice === undefined) continue;
        const exitPriceNum = Number(exitSignal.exitPrice);
        const pnl = await closeTrade(openTrade.id, bot.accountId, exitSignal.reason, exitPriceNum);
        await prisma.agentEvent.create({
          data: {
            botId: bot.id,
            accountId: bot.accountId,
            kind: "TRADE",
            message: `Closed ${openTrade.direction} on ${instrument} at ${exitPriceNum.toFixed(2)}. Reason: ${exitSignal.reason}. PnL: $${pnl?.toFixed(2)}`,
            tradeId: openTrade.id,
          },
        });
        continue;
      }

      // New entries only while the instrument's market is open.
      if (!isInstrumentTradeable(instrument)) continue;

      const entrySignal = bot.strategy.kind === "CUSTOM"
        ? evaluateCustomStrategy(params, marketData, null)
        : evaluateOrbStrategy(params, marketData, null);
      if (!entrySignal) continue;

      const risk = await validateRisk(bot.id, bot.accountId, entrySignal);
      if (!risk.passed) {
        if (risk.reason === "GLOBAL_HARD_STOP_BALANCE_TOO_LOW") {
          await prisma.bot.update({ where: { id: bot.id }, data: { status: "STOPPED" } });
        }
        continue;
      }

      try {
        const trade = await executeTrade(
          bot.id,
          bot.accountId,
          entrySignal,
          { sizeUnits: risk.sizeUnits || 0, riskPct: risk.riskPct || 0 },
          instrument,
        );
        await prisma.agentEvent.create({
          data: {
            botId: bot.id,
            accountId: bot.accountId,
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
              accountId: bot.accountId,
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

    return NextResponse.json({ ok: true, processed });
  } catch (error) {
    console.error("Cron engine error", error);
    return NextResponse.json({ error: "Engine execution failed" }, { status: 500 });
  }
}
