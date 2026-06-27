import { prisma } from "@/lib/db";
import { Signal } from "./signal-generator";
import { PLANS, type Plan } from "@/lib/plans";

const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Validate a prospective entry against the account's plan, balance, and the
 * strategy's own risk rules. `params` carries the live strategy settings so the
 * bot actually honours what the user configured: position size comes from
 * `riskPct`, a per-day entry cap from `maxTrades`, and a daily loss circuit
 * breaker from `dailyLoss`. Extra prisma reads only run when the matching param
 * is set, so the unit tests (which call this with no params) stay valid.
 */
export async function validateRisk(
  botId: string,
  accountId: string,
  signal: NonNullable<Signal>,
  params: Record<string, unknown> = {},
) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { user: true },
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

  // Account-level absolute daily drawdown limit (set in Settings, in dollars).
  const limit = account.maxDailyDrawdown ? Number(account.maxDailyDrawdown) : null;
  if (limit !== null && summary && summary.netPnl.toNumber() <= -limit) {
    return { passed: false, reason: "CIRCUIT_BREAKER_TRIPPED" };
  }

  const balance = Number(account.balance);

  // Prop Firm Mode limit check on entry
  if (account.isPropFirmMode && account.propFirmMaxTrailingDrawdown) {
    const trailingLimit = Number(account.propFirmMaxTrailingDrawdown);
    // Rough static drawdown check: if current balance is below (startBalance - trailingLimit)
    if (summary) {
       const startBalance = Number(summary.startBalance);
       if (balance <= startBalance - trailingLimit) {
         return { passed: false, reason: "PROP_FIRM_VIOLATION" };
       }
    }
  }

  // Strategy-level daily loss limit (percentage of the day's starting balance).
  const dailyLossPct = clampNum(Number(params.dailyLoss) || 0, 0, 5);
  if (dailyLossPct > 0 && summary) {
    const startBalance = Number(summary.startBalance) || balance;
    if (summary.netPnl.toNumber() < -(startBalance * (dailyLossPct / 100))) {
      return { passed: false, reason: "CIRCUIT_BREAKER_TRIPPED" };
    }
  }

  // Strategy-level cap on the number of entries per day.
  const maxTrades = Math.floor(clampNum(Number(params.maxTrades) || 0, 0, 50));
  if (maxTrades > 0) {
    const tradesToday = await prisma.trade.count({
      where: { botId, openedAt: { gte: today } },
    });
    if (tradesToday >= maxTrades) {
      return { passed: false, reason: "MAX_TRADES_REACHED" };
    }
  }

  // Global Hard Stop: if balance drops below $100
  if (balance < 100) {
    return { passed: false, reason: "GLOBAL_HARD_STOP_BALANCE_TOO_LOW" };
  }

  // Position sizing from the strategy's configured risk per trade (default 1%,
  // hard ceiling 2%). Size is derived from the real dollar risk to the stop.
  const riskPct = clampNum(Number(params.riskPct) || 1, 0.1, 2) / 100;
  const riskAmount = balance * riskPct;
  const stopDistance = Math.abs(signal.entryPrice - signal.stopPrice);
  const sizeUnits = stopDistance > 0 ? riskAmount / stopDistance : 1;

  return { passed: true, sizeUnits, riskPct };
}
