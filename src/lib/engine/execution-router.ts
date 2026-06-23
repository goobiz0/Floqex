import { prisma } from "@/lib/db";
import { Signal } from "./signal-generator";

export async function executeTrade(botId: string, accountId: string, signal: NonNullable<Signal>, risk: any, instrument: string) {
  // Real world slippage injection: you rarely get filled exactly at the signal price
  // We simulate 1 basis point (0.01%) of slippage to make the system highly realistic
  const slippage = signal.direction === 'LONG' ? signal.entryPrice * 0.0001 : -(signal.entryPrice * 0.0001);
  const filledPrice = signal.entryPrice + slippage;

  return await prisma.trade.create({
    data: {
      botId,
      accountId,
      instrument,
      direction: signal.direction,
      session: "NY",
      status: "OPEN",
      entryPrice: filledPrice,
      stopPrice: signal.stopPrice,
      targetPrice: signal.targetPrice,
      sizeUnits: risk.sizeUnits,
      riskPct: risk.riskPct,
    }
  });
}

export async function closeTrade(tradeId: string, accountId: string, exitReason: string, exitPrice: number) {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) return null;

  const isLong = trade.direction === 'LONG';
  
  // Exit slippage injection
  const slippage = isLong ? -(exitPrice * 0.0001) : exitPrice * 0.0001; 
  const finalExitPrice = exitPrice + slippage;

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

  return pnl;
}
