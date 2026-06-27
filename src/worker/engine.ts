import { prisma } from "../lib/db";
import { getRealMarketData } from "../lib/engine/market-data";
import { evaluateOrbStrategy, evaluateCustomStrategy, evaluateExit } from "../lib/engine/signal-generator";
import { executeTrade, closeTrade } from "../lib/engine/execution-router";
import { validateRisk } from "../lib/engine/risk-engine";
import { BrokerNotConfiguredError } from "../lib/engine/live-broker";
import { recordBotStatus, RISK_REASON_TEXT } from "../lib/engine/feedback";
import { isInstrumentTradeable, marketLabel, getMarketForInstrument } from "../lib/market";
import { sendUrgentAlert } from "../lib/alerting";
import { instrumentsFromParams } from "../lib/custom-strategy";
import { checkEdgeDecay } from "../lib/engine/edge-decay";

// Engine configuration
const TICK_RATE_MS = 2000; // 2 seconds

// In-memory tracker for edge decay
const lastEdgeDecayCheck: Record<string, number> = {};

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
      // Skip bots not attached to an account
      if (!bot.accountId || !bot.account) continue;

      // Check Edge Decay periodically (every 1 hour)
      const now = Date.now();
      if (!lastEdgeDecayCheck[bot.id] || now - lastEdgeDecayCheck[bot.id] > 60 * 60 * 1000) {
        lastEdgeDecayCheck[bot.id] = now;
        checkEdgeDecay(bot.id).catch(console.error);
      }

      // Update heartbeat
      await prisma.bot.update({
        where: { id: bot.id },
        data: { lastHeartbeat: new Date() },
      });

      const params = typeof bot.strategy.params === 'string' 
        ? JSON.parse(bot.strategy.params) 
        : bot.strategy.params;

      // A bot can trade several instruments. Evaluate each independently; the
      // per-account risk limits below still span all of them.
      const instruments = instrumentsFromParams(params);
      for (const instrument of instruments) {
      const openTrade = await prisma.trade.findFirst({
        where: { botId: bot.id, status: "OPEN", instrument },
      });

      const marketData = await getRealMarketData(instrument);

      if (!marketData) {
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
            const pnl = await closeTrade(openTrade.id, bot.accountId!, exitSignal.reason, exitSignal.exitPrice);
            
            await prisma.agentEvent.create({
              data: {
                botId: bot.id,
                accountId: bot.accountId!,
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
        } else if (bot.account.isPropFirmMode) {
          // Prop Firm specific hard-stop logic on open trade floating PnL
          // This evaluates the current balance against the start of day balance minus the trailing drawdown limit.
          const limit = bot.account.propFirmMaxTrailingDrawdown ? Number(bot.account.propFirmMaxTrailingDrawdown) : 0;
          if (limit > 0) {
            // Rough approximation of floating PNL 
            const isLong = openTrade.direction === "LONG";
            const diff = isLong 
              ? marketData.price - Number(openTrade.entryPrice)
              : Number(openTrade.entryPrice) - marketData.price;
            const floatingPnl = diff * Number(openTrade.sizeUnits);
            
            // Fetch daily summary to get closed PNL
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const summary = await prisma.dailySummary.findFirst({ where: { accountId: bot.accountId!, date: today } });
            
            const startBalance = summary ? Number(summary.startBalance) : Number(bot.account.balance);
            const currentBalance = Number(bot.account.balance) + floatingPnl;
            const limitThreshold = startBalance - limit;

            if (currentBalance <= limitThreshold) {
               console.log(`[PROP FIRM LIMIT BREACH] Bot ${bot.id} breached trailing drawdown limit!`);
               try {
                 await closeTrade(openTrade.id, bot.accountId!, "PROP_FIRM_LIMIT_BREACH", marketData.price);
                 await prisma.bot.update({ where: { id: bot.id }, data: { status: "STOPPED" }});
                 await recordBotStatus({
                   botId: bot.id,
                   accountId: bot.accountId!,
                   kind: "RISK",
                   message: `Prop Firm Trailing Drawdown Breached (Balance dropped to $${currentBalance.toFixed(2)}, limit is $${limitThreshold.toFixed(2)}). Trade closed and bot halted.`,
                 });
                 await sendUrgentAlert(bot.account.userId, "RISK", "Prop Firm Rule Violation", `Bot halted. Max trailing drawdown limit breached.`, { botId: bot.id });
               } catch (e) {
                 console.error("Failed to close on prop firm breach", e);
               }
            }
          }
        }

      } else {
        // Only open new positions while the instrument's market is in session.
        if (!isInstrumentTradeable(instrument)) {
          await recordBotStatus({
            botId: bot.id,
            accountId: bot.accountId!,
            kind: "INFO",
            message: `${marketLabel(getMarketForInstrument(instrument))} is closed right now. Holding flat on ${instrument}. The bot will look for entries when the market reopens.`,
            throttleMs: 30 * 60 * 1000,
          });
          continue;
        }

        let entrySignal = null;
        if (bot.strategy.kind === 'CUSTOM') {
          entrySignal = evaluateCustomStrategy(params, marketData, null);
        } else {
          entrySignal = evaluateOrbStrategy(params, marketData, null);
        }
        if (!entrySignal) {
          // Alive and scanning — no qualifying setup yet. Static copy so the
          // de-dupe in recordBotStatus can throttle the feed.
          const detail = bot.strategy.kind === 'CUSTOM'
            ? "the strategy conditions haven't all been met yet"
            : "price hasn't pushed to the edge of the day's range yet";
          await recordBotStatus({
            botId: bot.id,
            accountId: bot.accountId!,
            kind: "INFO",
            message: `Scanning ${instrument} for a setup. No entry yet (${detail}). Holding flat.`,
            throttleMs: 15 * 60 * 1000,
          });
        } else {
          console.log(`[ENTRY SIGNAL] ${entrySignal.direction} on bot ${bot.id}`);

          const risk = await validateRisk(bot.id, bot.accountId!, entrySignal, params);
          if (!risk.passed) {
            console.warn(`[RISK REJECTED] Bot ${bot.id} trade rejected: ${risk.reason}`);

            const reason = risk.reason ?? "RISK_BLOCKED";
            await recordBotStatus({
              botId: bot.id,
              accountId: bot.accountId!,
              kind: "RISK",
              message: `Setup found on ${instrument} but the trade was blocked: ${RISK_REASON_TEXT[reason] ?? reason}`,
              throttleMs: 10 * 60 * 1000,
            });

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
              bot.accountId!, 
              entrySignal, 
              { sizeUnits: risk.sizeUnits || 0, riskPct: risk.riskPct || 0 }, 
              instrument
            );

          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId!,
              kind: "SIGNAL",
              message: `Signal Generator triggered ${entrySignal.direction} on ${instrument} at ${entrySignal.entryPrice.toFixed(2)}. Routing to execution.`,
            }
          });

          await prisma.agentEvent.create({
            data: {
              botId: bot.id,
              accountId: bot.accountId!,
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
                  accountId: bot.accountId!,
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
    }
  } catch (error) {
    console.error("Engine tick error:", error);
  }
}

if (process.env.DEBUG) {
  console.log("==========================================");
  console.log("Floqex Background Trading Engine Started");
  console.log(`Tick Rate: ${TICK_RATE_MS / 1000} seconds`);
  console.log("==========================================");
}

async function runLoop() {
  await tick();
  setTimeout(runLoop, TICK_RATE_MS);
}

runLoop();
