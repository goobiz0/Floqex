import { prisma } from "@/lib/db";
import { Signal } from "./signal-generator";
import { PLANS, type Plan } from "@/lib/plans";

export async function validateRisk(botId: string, accountId: string, signal: NonNullable<Signal>, accountParams: any) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { user: true }
  });

  if (!account) return { passed: false, reason: "ACCOUNT_NOT_FOUND" };

  const planConfig = PLANS[account.user.plan as Plan];
  if (account.mode === "LIVE" && !planConfig.liveTrading) {
    return { passed: false, reason: "LIVE_TRADING_NOT_ALLOWED_ON_PLAN" };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const summary = await prisma.dailySummary.findFirst({
    where: { accountId, date: today },
  });

  const limit = account.maxDailyDrawdown ? Number(account.maxDailyDrawdown) : null;
  if (limit !== null && summary && summary.netPnl.toNumber() < -limit) {
    return { passed: false, reason: "CIRCUIT_BREAKER_TRIPPED" };
  }

  // Global Hard Stop: if balance drops below $100
  const balance = Number(account.balance);
  if (balance < 100) {
    return { passed: false, reason: "GLOBAL_HARD_STOP_BALANCE_TOO_LOW" };
  }

  // Risk 1% of total balance per trade
  const riskPct = 0.01; 
  const riskAmount = balance * riskPct; 
  const stopDistance = Math.abs(signal.entryPrice - signal.stopPrice);
  
  // Calculate exact position sizing based on real dollar risk
  const sizeUnits = stopDistance > 0 ? riskAmount / stopDistance : 1;

  return { passed: true, sizeUnits, riskPct };
}
