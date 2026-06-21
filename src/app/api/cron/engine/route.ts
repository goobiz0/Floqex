import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
// Optionally ensure this is securely callable by Vercel only:
// import { verifySignature } from '@upstash/qstash/nextjs'; // if using QStash
// or check auth header from Vercel CRON_SECRET

export async function GET(req: Request) {
  // In production, verify the CRON_SECRET here to prevent unauthorized execution.
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Unauthorized', { status: 401 });

  try {
    // 1. Fetch all bots that are currently RUNNING
    const activeBots = await prisma.bot.findMany({
      where: { status: "RUNNING" },
      include: {
        account: {
          include: {
            user: true,
          }
        },
        strategy: true,
      },
    });

    const executionLogs = [];

    for (const bot of activeBots) {
      // Update heartbeat
      await prisma.bot.update({
        where: { id: bot.id },
        data: { lastHeartbeat: new Date() },
      });

      const userPlan = PLANS[bot.account.user.plan as Plan] || PLANS.FREE;

      // 2. Enforce Circuit Breaker (Max Daily Loss)
      // Check today's daily summary for this account
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      const summary = await prisma.dailySummary.findFirst({
        where: { 
          accountId: bot.account.id,
          date: today,
        }
      });

      // If circuit breaker hit (e.g. netPnl is worse than -$500, or whatever limit the user set)
      // For now, we hardcode a basic check, but it would ideally pull from the user's settings table.
      if (summary && summary.netPnl.toNumber() < -500) {
        await prisma.bot.update({
          where: { id: bot.id },
          data: { status: "STOPPED" },
        });
        executionLogs.push({ botId: bot.id, action: "CIRCUIT_BREAKER_TRIPPED" });
        // Would also trigger Discord/Email notification here.
        continue;
      }

      // 3. Mock Strategy Evaluation
      // Here we would check the market data against bot.strategy.params
      // For now, we simulate a 5% chance to enter a trade every minute if there's no open trade
      
      const openTrade = await prisma.trade.findFirst({
        where: { botId: bot.id, status: "OPEN" },
      });

      if (!openTrade) {
        // Mock entry condition met
        if (Math.random() < 0.05) {
          const isLong = Math.random() > 0.5;
          const entryPrice = 5100 + (Math.random() * 100);
          const riskAmount = Number(bot.account.balance) * 0.01; // 1% risk
          
          await prisma.trade.create({
            data: {
              botId: bot.id,
              accountId: bot.account.id,
              instrument: "ES",
              direction: isLong ? "LONG" : "SHORT",
              session: "NY",
              status: "OPEN",
              entryPrice,
              stopPrice: isLong ? entryPrice - 15 : entryPrice + 15,
              targetPrice: isLong ? entryPrice + 30 : entryPrice - 30,
              sizeUnits: riskAmount / 15,
              riskPct: 1.0,
            }
          });
          executionLogs.push({ botId: bot.id, action: "TRADE_OPENED" });
        }
      } else {
        // Mock exit condition met
        if (Math.random() < 0.1) {
          const win = Math.random() > 0.4; // 60% win rate mock
          const pnl = win ? 200 : -100;
          
          await prisma.$transaction(async (tx) => {
            await tx.trade.update({
              where: { id: openTrade.id },
              data: {
                status: "CLOSED",
                closedAt: new Date(),
                exitPrice: win ? Number(openTrade.targetPrice) : Number(openTrade.stopPrice),
                netPnl: pnl,
                rMultiple: win ? 2.0 : -1.0,
              }
            });

            await tx.account.update({
              where: { id: bot.account.id },
              data: { balance: { increment: pnl } }
            });

            // Update daily summary
            await tx.dailySummary.upsert({
              where: {
                accountId_date: {
                  accountId: bot.account.id,
                  date: today,
                }
              },
              update: {
                netPnl: { increment: pnl },
                tradeCount: { increment: 1 },
                winCount: { increment: win ? 1 : 0 },
                lossCount: { increment: win ? 0 : 1 },
                endBalance: Number(bot.account.balance) + pnl,
              },
              create: {
                accountId: bot.account.id,
                date: today,
                netPnl: pnl,
                tradeCount: 1,
                winCount: win ? 1 : 0,
                lossCount: win ? 0 : 1,
                startBalance: bot.account.balance,
                endBalance: Number(bot.account.balance) + pnl,
              }
            });
          });
          executionLogs.push({ botId: bot.id, action: "TRADE_CLOSED", pnl });
        }
      }
    }

    return NextResponse.json({ ok: true, processed: activeBots.length, logs: executionLogs });
  } catch (error) {
    console.error("Cron execution error", error);
    return NextResponse.json({ ok: false, error: "Internal execution error" }, { status: 500 });
  }
}
