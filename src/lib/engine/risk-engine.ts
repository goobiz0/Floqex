import { prisma } from "@/lib/db";
import { Signal } from "./signal-generator";

export async function validateRisk(botId: string, accountId: string, signal: NonNullable<Signal>, accountParams: any) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const summary = await prisma.dailySummary.findFirst({
    where: { accountId, date: today },
  });

  const limit = accountParams.maxDailyDrawdown ? Number(accountParams.maxDailyDrawdown) : null;
  if (limit !== null && summary && summary.netPnl.toNumber() < -limit) {
    return { passed: false, reason: "CIRCUIT_BREAKER_TRIPPED" };
  }

  const balance = Number(accountParams.balance);
  if (balance <= 0) {
    return { passed: false, reason: "INSUFFICIENT_FUNDS" };
  }

  // Risk 1% of total balance per trade
  const riskPct = 0.01; 
  const riskAmount = balance * riskPct; 
  const stopDistance = Math.abs(signal.entryPrice - signal.stopPrice);
  
  // Calculate exact position sizing based on real dollar risk
  const sizeUnits = stopDistance > 0 ? riskAmount / stopDistance : 1;

  return { passed: true, sizeUnits, riskPct };
}
