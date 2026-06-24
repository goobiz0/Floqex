import { prisma } from "../lib/db";
import { getRealMarketData } from "../lib/engine/market-data";
import { evaluateOrbStrategy, evaluateExit } from "../lib/engine/signal-generator";
import { executeTrade, closeTrade } from "../lib/engine/execution-router";

// Engine configuration
const TICK_RATE_MS = 10000; // 10 seconds

async function tick() {
  try {
    const bots = await prisma.bot.findMany({
      where: { status: "RUNNING" },
      include: {
        account: true,
        strategy: true,
      },
    });

    if (bots.length === 0) {
      console.log(`[${new Date().toISOString()}] Engine Tick: No running bots found.`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Engine Tick: Processing ${bots.length} running bot(s)...`);

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

      // Defaulting to NQ for ORB simulation
      const marketData = await getRealMarketData("NQ");
      
      if (!marketData) {
        continue;
      }

      // Log info event occasionally to prove the engine is listening
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
        const exitSignal = evaluateExit(openTrade, marketData);
        if (exitSignal) {
          console.log(`[EXIT SIGNAL] ${exitSignal.reason} on bot ${bot.id}`);
          const pnl = await closeTrade(openTrade.id, bot.accountId, exitSignal.reason, exitSignal.exitPrice);
          
          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId,
              kind: "TRADE",
              message: `Closed ${openTrade.direction} on NQ at ${exitSignal.exitPrice.toFixed(2)}. Reason: ${exitSignal.reason}. PnL: $${pnl?.toFixed(2)}`,
              tradeId: openTrade.id
            }
          });
        }
      } else {
        const entrySignal = evaluateOrbStrategy(params, marketData, null);
        if (entrySignal) {
          console.log(`[ENTRY SIGNAL] ${entrySignal.direction} on bot ${bot.id}`);
          const riskPct = params.riskPct || 1;
          const balance = Number(bot.account.balance);
          
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
              message: `Signal Generator triggered ${entrySignal.direction} on NQ at ${entrySignal.entryPrice.toFixed(2)}. Routing to execution.`,
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
  } catch (error) {
    console.error("Engine tick error:", error);
  }
}

console.log("==========================================");
console.log("🚀 Floqex Background Trading Engine Started");
console.log(`⏱️  Tick Rate: ${TICK_RATE_MS / 1000} seconds`);
console.log("==========================================");

// Initial tick
tick();

// Start infinite loop
setInterval(tick, TICK_RATE_MS);
