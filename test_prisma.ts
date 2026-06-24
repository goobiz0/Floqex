import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

process.env.DATABASE_URL = "postgresql://postgres:z5b4O%294TK0l%3A@db.fisqjoalatwvddzityww.supabase.co:6543/postgres?pgbouncer=true";

async function run() {
  const user = await prisma.user.findFirst({
    include: {
      accounts: { orderBy: { createdAt: "asc" }, include: { bot: true } },
      strategies: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });
  
  if (!user) {
    console.log("No user found");
    return;
  }
  console.log("User:", user.id);
  
  const account = user.accounts[0];
  const bot = account?.bot ?? null;
  const strategy = bot
      ? await prisma.strategy.findUnique({ where: { id: bot.strategyId } })
      : (user.strategies[0] ?? null);
      
  console.log("Strategy:", strategy);
  
  const adjustments = bot
      ? await prisma.botAdjustment.findMany({
          where: { botId: bot.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];
      
  console.log("Adjustments count:", adjustments.length);
}

run().catch(console.error).finally(() => prisma.$disconnect());
