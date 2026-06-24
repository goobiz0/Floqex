import { prisma } from "../lib/db";
import { getRealMarketData } from "../lib/engine/market-data";
import { evaluateOrbStrategy, evaluateExit } from "../lib/engine/signal-generator";
import { executeTrade, closeTrade } from "../lib/engine/execution-router";
import { validateRisk } from "../lib/engine/risk-engine";
import { sendUrgentAlert } from "../lib/alerting";

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

      const instrument = params.instrument || "NQ";
      const marketData = await getRealMarketData(instrument);
      
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
            message: `Market pulse: ${instrument} @ ${marketData.price.toFixed(2)}. Day range: ${marketData.dayLow.toFixed(2)} - ${marketData.dayHigh.toFixed(2)}.`,
          }
        });
      }

      if (openTrade) {
        const exitSignal = evaluateExit(openTrade, marketData);
        if (exitSignal) {
          console.log(`[EXIT SIGNAL] ${exitSignal.reason} on bot ${bot.id}`);
          try {
            const pnl = await closeTrade(openTrade.id, bot.accountId, exitSignal.reason, exitSignal.exitPrice);
            
            await prisma.agentEvent.create({
              data: {
                botId: bot.id,
                accountId: bot.accountId,
                kind: "TRADE",
                message: `Closed ${openTrade.direction} on ${instrument} at ${exitSignal.exitPrice.toFixed(2)}. Reason: ${exitSignal.reason}. PnL: $${pnl?.toFixed(2)}`,
                tradeId: openTrade.id
              }
            });
            await sendUrgentAlert(bot.account.userId, "TRADE", "Trade Closed", `Closed ${openTrade.direction} on ${instrument} at ${exitSignal.exitPrice.toFixed(2)}. Reason: ${exitSignal.reason}. PnL: $${pnl?.toFixed(2)}`, { botId: bot.id, pnl });
          } catch (error: any) {
            console.error(`[FATAL] Failed to close trade ${openTrade.id}:`, error);
            await sendUrgentAlert(bot.account.userId, "ERROR", "Live Exit Execution Failed", `Failed to close position for bot ${bot.id}`, { error: error.message, botId: bot.id });
          }
        }

      } else {
        const entrySignal = evaluateOrbStrategy(params, marketData, null);
        if (entrySignal) {
          console.log(`[ENTRY SIGNAL] ${entrySignal.direction} on bot ${bot.id}`);

          const risk = await validateRisk(bot.id, bot.accountId, entrySignal, params);
          if (!risk.passed) {
            console.warn(`[RISK REJECTED] Bot ${bot.id} trade rejected: ${risk.reason}`);
            
            if (risk.reason === "GLOBAL_HARD_STOP_BALANCE_TOO_LOW" || risk.reason === "CIRCUIT_BREAKER_TRIPPED") {
              await sendUrgentAlert(bot.account.userId, "RISK", "Risk Engine Tripped", `Trade rejected due to risk constraints.`, { botId: bot.id, reason: risk.reason });
            }

            // Stop the bot automatically on hard stops
            if (risk.reason === "GLOBAL_HARD_STOP_BALANCE_TOO_LOW") {
              await prisma.bot.update({ where: { id: bot.id }, data: { status: "STOPPED" }});
            }

            continue;
          }

          try {
            const trade = await executeTrade(
              bot.id, 
              bot.accountId, 
              entrySignal, 
              { sizeUnits: risk.sizeUnits, riskPct: risk.riskPct }, 
              instrument
            );

          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId,
              kind: "SIGNAL",
              message: `Signal Generator triggered ${entrySignal.direction} on ${instrument} at ${entrySignal.entryPrice.toFixed(2)}. Routing to execution.`,
            }
          });

          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId,
              kind: "TRADE",
              message: `Executed ${entrySignal.direction} on ${instrument} at ${entrySignal.entryPrice.toFixed(2)}. Size: ${(risk.sizeUnits || 0).toFixed(4)}. Stop: ${entrySignal.stopPrice.toFixed(2)}. Target: ${entrySignal.targetPrice.toFixed(2)}`,
              tradeId: trade.id
            }
          });
          await sendUrgentAlert(bot.account.userId, "TRADE", "Trade Executed", `Executed ${entrySignal.direction} on ${instrument} at ${entrySignal.entryPrice.toFixed(2)}. Size: ${(risk.sizeUnits || 0).toFixed(4)}. Stop: ${entrySignal.stopPrice.toFixed(2)}. Target: ${entrySignal.targetPrice.toFixed(2)}`, { botId: bot.id });
          } catch (error: any) {
            console.error(`[FATAL] Failed to execute trade for bot ${bot.id}:`, error);
            await sendUrgentAlert(bot.account.userId, "ERROR", "Live Entry Execution Failed", `Failed to open position for bot ${bot.id}`, { error: error.message, botId: bot.id });
          }
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
