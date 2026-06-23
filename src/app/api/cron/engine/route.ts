/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";
import type { Prisma } from "@prisma/client";
import { getRealMarketData } from "@/lib/engine/market-data";
import { evaluateOrbStrategy, evaluateExit } from "@/lib/engine/signal-generator";
import { validateRisk } from "@/lib/engine/risk-engine";
import { executeTrade, closeTrade } from "@/lib/engine/execution-router";
import { runLearningEngine } from "@/lib/engine/learning-engine";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const activeBots = await prisma.bot.findMany({
      where: { status: "RUNNING" },
      include: {
        account: {
          include: { user: true },
        },
        strategy: true,
      },
    });

    const executionLogs = [];
    
    // Fetch unique instruments from all active bots
    // Defaulting to "ES" if no specific instrument is set on the strategy
    // In our simplified system, we'll assume ES for everyone
    const marketData = await getRealMarketData("ES");
    
    if (!marketData) {
      return NextResponse.json({ ok: false, error: "Failed to fetch live market data" }, { status: 500 });
    }

    for (const bot of activeBots) {
      await prisma.bot.update({
        where: { id: bot.id },
        data: { lastHeartbeat: new Date() },
      });

      const openTrade = await prisma.trade.findFirst({
        where: { botId: bot.id, status: "OPEN" },
      });

      if (!openTrade) {
        // ENTRY LOGIC
        const signal = evaluateOrbStrategy(bot.strategy.params, marketData, null);
        
        if (signal) {
          const riskCheck = await validateRisk(bot.id, bot.account.id, signal, bot.account);
          
          if (riskCheck.passed) {
            await executeTrade(bot.id, bot.account.id, signal, riskCheck, "ES");
            executionLogs.push({ botId: bot.id, action: "TRADE_OPENED", direction: signal.direction });
          } else {
            // If circuit breaker tripped, stop the bot
            if (riskCheck.reason === "CIRCUIT_BREAKER_TRIPPED") {
              await prisma.bot.update({
                where: { id: bot.id },
                data: { status: "STOPPED" },
              });
              executionLogs.push({ botId: bot.id, action: "CIRCUIT_BREAKER_TRIPPED" });
            }
          }
        }
      } else {
        // EXIT LOGIC
        const exitSignal = evaluateExit(openTrade, marketData);
        
        if (exitSignal) {
          const pnl = await closeTrade(openTrade.id, bot.account.id, exitSignal.reason, exitSignal.exitPrice);
          executionLogs.push({ botId: bot.id, action: "TRADE_CLOSED", pnl });
          
          // Self-Optimizing Learning Engine
          // After a trade closes, if the user is on the PRO plan, run the learning engine
          if (bot.account.user.plan === "PRO") {
            await runLearningEngine(bot.id, bot.strategyId);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, processed: activeBots.length, price: marketData.price, logs: executionLogs });
  } catch (error) {
    console.error("Cron execution error", error);
    return NextResponse.json({ ok: false, error: "Internal execution error" }, { status: 500 });
  }
}
