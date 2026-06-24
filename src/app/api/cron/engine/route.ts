import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRealMarketData } from "@/lib/engine/market-data";
import { evaluateOrbStrategy, evaluateExit } from "@/lib/engine/signal-generator";
import { executeTrade, closeTrade } from "@/lib/engine/execution-router";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Allow execution via Vercel Cron OR a custom API secret header/query for free external cron services.
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
      include: {
        account: true,
        strategy: true,
      },
    });

    if (bots.length === 0) {
      return NextResponse.json({ ok: true, message: "No running bots" });
    }

    // Process each bot
    for (const bot of bots) {
      // Update heartbeat
      await prisma.bot.update({
        where: { id: bot.id },
        data: { lastHeartbeat: new Date() },
      });

      const params = typeof bot.strategy.params === 'string' 
        ? JSON.parse(bot.strategy.params) 
        : bot.strategy.params;

      const openTrade = await prisma.trade.findFirst({
        where: { botId: bot.id, status: "OPEN" },
      });

      // Fetch market data (assuming NQ as default for ORB for this example)
      const marketData = await getRealMarketData("NQ");
      
      if (!marketData) {
        continue;
      }

      // Log info event occasionally
      if (Math.random() > 0.8 && !openTrade) {
        await prisma.agentEvent.create({
          data: {
            botId: bot.id,
            accountId: bot.accountId,
            kind: "INFO",
            message: `Market pulse: NQ @ ${marketData.price.toFixed(2)}. Day range: ${marketData.dayLow.toFixed(2)} - ${marketData.dayHigh.toFixed(2)}.`,
          }
        });
      }

      if (openTrade) {
        const exitSignal = evaluateExit(openTrade, marketData, params);
        if (exitSignal) {
          if (exitSignal.reason === 'TRAIL_UPDATE' && exitSignal.newStopPrice) {
            await prisma.trade.update({
              where: { id: openTrade.id },
              data: { stopPrice: exitSignal.newStopPrice }
            });
            continue;
          }

          if (exitSignal.exitPrice !== undefined) {
            const exitPriceNum = Number(exitSignal.exitPrice);
            const pnl = await closeTrade(openTrade.id, bot.accountId, exitSignal.reason, exitPriceNum);
            
            await prisma.agentEvent.create({
              data: {
                botId: bot.id,
                accountId: bot.accountId,
                kind: "TRADE",
                message: `Closed ${openTrade.direction} on NQ at ${exitPriceNum.toFixed(2)}. Reason: ${exitSignal.reason}. PnL: $${pnl?.toFixed(2)}`,
                tradeId: openTrade.id
              }
            });
          }
        }
      } else {
        const entrySignal = evaluateOrbStrategy(params, marketData, null);
        if (entrySignal) {
          const riskPct = params.riskPct || 1;
          const balance = Number(bot.account.balance);
          
          // Basic position sizing based on risk % and stop distance
          const riskAmount = balance * (riskPct / 100);
          const priceRisk = Math.abs(entrySignal.entryPrice - entrySignal.stopPrice);
          const sizeUnits = priceRisk > 0 ? riskAmount / priceRisk : 0.1;

          const trade = await executeTrade(
            bot.id, 
            bot.accountId, 
            entrySignal, 
            { sizeUnits, riskPct }, 
            "NQ"
          );

          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId,
              kind: "SIGNAL",
              message: `Signal Generator triggered ${entrySignal.direction} on NQ at ${entrySignal.entryPrice.toFixed(2)}. Routing to execution engine.`,
            }
          });

          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId,
              kind: "TRADE",
              message: `Executed ${entrySignal.direction} on NQ at ${entrySignal.entryPrice.toFixed(2)}. Size: ${sizeUnits.toFixed(4)}. Stop: ${entrySignal.stopPrice.toFixed(2)}. Target: ${entrySignal.targetPrice.toFixed(2)}`,
              tradeId: trade.id
            }
          });
        }
      }
    }

    return NextResponse.json({ ok: true, processed: bots.length });
  } catch (error) {
    console.error("Cron engine error", error);
    return NextResponse.json({ error: "Engine execution failed" }, { status: 500 });
  }
}
