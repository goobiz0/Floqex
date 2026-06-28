import { prisma } from "@/lib/db";
import { Signal } from "./signal-generator";
import { decrypt } from "@/lib/crypto";
import { executeLiveOrder, closeLivePosition } from "./live-broker";
import { getSessionForInstrument } from "@/lib/market";

type ExecOpts = {
  /** When false, this trade is itself a copy and must not be replicated again
   *  (prevents recursion and copy chains). Defaults to true for first-party trades. */
  replicate?: boolean;
};

export async function executeTrade(botId: string, accountId: string, signal: NonNullable<Signal>, risk: { sizeUnits: number; riskPct: number }, instrument: string, opts: ExecOpts = {}) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { connection: true },
  });

  if (!account) throw new Error("Account not found");

  const intendedEntryPrice = signal.entryPrice;
  const fillStart = Date.now();
  let filledPrice = signal.entryPrice;

  if (account.mode === "LIVE" && account.connection) {
    // ---------------------------------------------------------
    // LIVE EXECUTION
    // Route to actual broker API (CCXT, Alpaca, etc.)
    // ---------------------------------------------------------
    const credsStr = decrypt(account.connection.encrypted);
    const creds = JSON.parse(credsStr);
    creds.mode = account.mode;
    
    // Abstracted live order placement
    console.log(`[LIVE EXECUTION] Dispatching ${signal.direction} order for ${instrument} to ${account.broker}`);
    
    try {
      const order = await executeLiveOrder(account.broker, creds, instrument, signal.direction, risk.sizeUnits);
      filledPrice = order.filledPrice || signal.entryPrice;
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Live Execution Failed:", err.message);
      throw new Error(`Failed to execute live order: ${err.message}`);
    }
  } else {
    // ---------------------------------------------------------
    // PAPER EXECUTION
    // ---------------------------------------------------------
    // Real world slippage injection: you rarely get filled exactly at the signal price
    // We simulate 1 basis point (0.01%) of slippage to make the system highly realistic
    const slippage = signal.direction === 'LONG' ? signal.entryPrice * 0.0001 : -(signal.entryPrice * 0.0001);
    filledPrice = signal.entryPrice + slippage;
  }

  const trade = await prisma.trade.create({
    data: {
      botId,
      accountId,
      instrument,
      direction: signal.direction,
      session: getSessionForInstrument(instrument),
      status: "OPEN",
      entryPrice: filledPrice,
      stopPrice: signal.stopPrice,
      targetPrice: signal.targetPrice,
      sizeUnits: risk.sizeUnits,
      riskPct: risk.riskPct,
      intendedEntryPrice,
      entrySlippageBps: slippageBps(intendedEntryPrice, filledPrice, signal.direction, "ENTRY"),
      entryLatencyMs,
    }
  });

  // Fan this fill out to any follower accounts (copy trading). Lazily imported
  // to break the module cycle, and fully guarded so a copy failure never affects
  // the master trade that just succeeded.
  if (opts.replicate !== false) {
    try {
      const { replicateOpen } = await import("./copy-trading");
      await replicateOpen(trade);
    } catch (e) {
      console.error("[execution-router] copy replication (open) failed", e);
    }
  }

  return trade;
}

export async function closeTrade(tradeId: string, accountId: string, exitReason: string, exitPrice: number, opts: ExecOpts = {}) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { connection: true },
  });

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || !account) return null;

  const isLong = trade.direction === 'LONG';
  let finalExitPrice = exitPrice;
  
  if (account.mode === "LIVE" && account.connection) {
    console.log(`[LIVE EXECUTION] Closing ${trade.direction} position on ${trade.instrument} at ${account.broker}`);
    
    const credsStr = decrypt(account.connection.encrypted);
    const creds = JSON.parse(credsStr);
    creds.mode = account.mode;

    try {
      const order = await closeLivePosition(account.broker, creds, trade.instrument, trade.direction, Number(trade.sizeUnits));
      finalExitPrice = order.filledPrice || exitPrice;
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Live Exit Execution Failed:", err.message);
      throw new Error(`Failed to close live position: ${err.message}`);
    }
  } else {
    // Exit slippage injection for Paper
    const slippage = isLong ? -(exitPrice * 0.0001) : exitPrice * 0.0001; 
    finalExitPrice = exitPrice + slippage;
  }

  const priceDiff = isLong ? finalExitPrice - Number(trade.entryPrice) : Number(trade.entryPrice) - finalExitPrice;
  const pnl = priceDiff * Number(trade.sizeUnits);
  
  // R-Multiple calculation (Reward/Risk ratio of the trade)
  const rMultiple = pnl / (Number(trade.entryPrice) * Number(trade.riskPct)); 

  await prisma.$transaction(async (tx) => {
    await tx.trade.update({
      where: { id: tradeId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        exitPrice: finalExitPrice,
        netPnl: pnl,
        rMultiple,
        intendedExitPrice: exitPrice,
        exitSlippageBps: slippageBps(exitPrice, finalExitPrice, trade.direction, "EXIT"),
      }
    });

    const account = await tx.account.findUnique({ where: { id: accountId } });
    if (!account) return;

    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: pnl } }
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const win = pnl > 0;

    await tx.dailySummary.upsert({
      where: { accountId_date: { accountId, date: today } },
      update: {
        netPnl: { increment: pnl },
        tradeCount: { increment: 1 },
        winCount: { increment: win ? 1 : 0 },
        lossCount: { increment: win ? 0 : 1 },
        endBalance: Number(account.balance) + pnl,
      },
      create: {
        accountId,
        date: today,
        netPnl: pnl,
        tradeCount: 1,
        winCount: win ? 1 : 0,
        lossCount: win ? 0 : 1,
        startBalance: account.balance,
        endBalance: Number(account.balance) + pnl,
      }
    });
  });

  // Mirror this exit onto any follower trades that copied it. Same recursion
  // guard and best-effort handling as the open path; followers re-apply their
  // own slippage to the raw market exit price.
  if (opts.replicate !== false) {
    try {
      const { replicateClose } = await import("./copy-trading");
      await replicateClose(trade, exitPrice);
    } catch (e) {
      console.error("[execution-router] copy replication (close) failed", e);
    }
  }

  return pnl;
}
