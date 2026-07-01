import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
function num(d: unknown): number {
  return Number(d as { toString(): string });
}
function numOrNull(d: unknown): number | null {
  return d === null || d === undefined ? null : Number(d as { toString(): string });
}

function serializeTrade(t: any): any {
  return {
    id: t.id,
    entryPrice: num(t.entryPrice),
    exitPrice: numOrNull(t.exitPrice),
    stopPrice: num(t.stopPrice),
    targetPrice: num(t.targetPrice),
    sizeUnits: num(t.sizeUnits),
    netPnl: numOrNull(t.netPnl),
    grossPnl: numOrNull(t.grossPnl),
    rMultiple: numOrNull(t.rMultiple),
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
  };
}

async function main() {
  try {
    const user = await prisma.user.findFirst({
      include: {
        accounts: { 
          orderBy: { createdAt: "asc" }, 
          include: { bot: true } 
        },
      },
    });
    if (user && user.accounts.length > 0) {
      const account = user.accounts[0];
      const trades = await prisma.trade.findMany({
        where: { accountId: account.id, status: "CLOSED" },
        take: 1,
      });
      console.log("Trades mapped:", trades.map(serializeTrade));
    }
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
