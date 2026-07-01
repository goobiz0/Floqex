import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
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
    console.log("User:", !!user);
    if (user && user.accounts.length > 0) {
      const account = user.accounts[0];
      const trades = await prisma.trade.findMany({
        where: { accountId: account.id, status: "CLOSED" },
        take: 1,
      });
      console.log("Trades:", trades.length);
      const summaries = await prisma.dailySummary.findMany({
        where: { accountId: account.id },
        take: 1,
      });
      console.log("Summaries:", summaries.length);
    }
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
