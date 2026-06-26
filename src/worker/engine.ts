import { prisma } from "../lib/db";
import { getRealMarketData } from "../lib/engine/market-data";
import { evaluateOrbStrategy, evaluateCustomStrategy, evaluateExit } from "../lib/engine/signal-generator";
import { executeTrade, closeTrade } from "../lib/engine/execution-router";
import { validateRisk } from "../lib/engine/risk-engine";
import { BrokerNotConfiguredError } from "../lib/engine/live-broker";
import { isInstrumentTradeable, marketLabel, getMarketForInstrument } from "../lib/market";
import { sendUrgentAlert } from "../lib/alerting";

// Engine configuration
const TICK_RATE_MS = 2000; // 2 seconds

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
        const exitSignal = evaluateExit(openTrade, marketData, params);
        if (exitSignal) {
          if (exitSignal.reason === 'TRAIL_UPDATE' && exitSignal.newStopPrice) {
            console.log(`[TRAIL] Updating stop on bot ${bot.id} to ${exitSignal.newStopPrice.toFixed(2)}`);
            await prisma.trade.update({
              where: { id: openTrade.id },
              data: { stopPrice: exitSignal.newStopPrice }
            });
            continue;
          }
          
          if (!exitSignal.exitPrice) continue;

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
          } catch (e: unknown) {
            const error = e as Error;
            console.error(`[FATAL] Failed to close trade ${openTrade.id}:`, error);
            await sendUrgentAlert(bot.account.userId, "ERROR", "Live Exit Execution Failed", `Failed to close position for bot ${bot.id}`, { error: error.message, botId: bot.id });
          }
        }

      } else {
        // Only open new positions while the instrument's market is in session.
        if (!isInstrumentTradeable(instrument)) {
          if (Math.random() > 0.95) {
            await prisma.agentEvent.create({
              data: {
                botId: bot.id,
                accountId: bot.accountId,
                kind: "INFO",
                message: `${marketLabel(getMarketForInstrument(instrument))} is closed. Holding flat on ${instrument} until the next session.`,
              }
            });
          }
          continue;
        }

        let entrySignal = null;
        if (bot.strategy.kind === 'CUSTOM') {
          entrySignal = evaluateCustomStrategy(params, marketData, null);
        } else {
          entrySignal = evaluateOrbStrategy(params, marketData, null);
        }
        if (entrySignal) {
          console.log(`[ENTRY SIGNAL] ${entrySignal.direction} on bot ${bot.id}`);

          const risk = await validateRisk(bot.id, bot.accountId, entrySignal);
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
              { sizeUnits: risk.sizeUnits || 0, riskPct: risk.riskPct || 0 }, 
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
          } catch (e: unknown) {
            const error = e as Error;
            console.error(`[FATAL] Failed to execute trade for bot ${bot.id}:`, error);

            if (error instanceof BrokerNotConfiguredError) {
              // No real route for this live broker: record honestly and stop the
              // bot rather than retry forever or fabricate a fill.
              await prisma.agentEvent.create({
                data: {
                  botId: bot.id,
                  accountId: bot.accountId,
                  kind: "RISK",
                  message: `Live execution blocked: ${error.message} Bot stopped. Connect a supported broker to trade live.`,
                }
              });
              await prisma.bot.update({ where: { id: bot.id }, data: { status: "STOPPED" } });
              await sendUrgentAlert(bot.account.userId, "ERROR", "Broker Not Configured", error.message, { botId: bot.id });
            } else {
              await sendUrgentAlert(bot.account.userId, "ERROR", "Live Entry Execution Failed", `Failed to open position for bot ${bot.id}`, { error: error.message, botId: bot.id });
            }
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

async function runLoop() {
  await tick();
  setTimeout(runLoop, TICK_RATE_MS);
}

runLoop();
