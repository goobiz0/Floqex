import { prisma } from "@/lib/db";
import { Signal } from "./signal-generator";
import { PLANS, type Plan } from "@/lib/plans";
import { checkPortfolioRisk } from "./portfolio-risk";

const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// ── In-memory daily realized-P&L tracker ─────────────────────────────────────
// The DB `dailySummary` is the source of truth, but it is written inside the
// close transaction. This in-process accumulator updates the instant a trade
// closes, so a burst of entries in the same tick can be circuit-broken without
// waiting on a fresh read. It only ever ADDS an early break; the DB check below
// remains authoritative, so a partial view (e.g. under sharding) is always safe.
type DailyPnl = { day: string; realized: number };
const dailyPnlCache = new Map<string, DailyPnl>();

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add a realized P&L delta for an account's running daily total. */
export function recordRealizedPnl(accountId: string, pnl: number): void {
  if (!Number.isFinite(pnl)) return;
  const day = utcDayKey();
  const cur = dailyPnlCache.get(accountId);
  if (!cur || cur.day !== day) dailyPnlCache.set(accountId, { day, realized: pnl });
  else cur.realized += pnl;
}

/** Read the in-memory realized P&L for today (0 if none / stale). */
export function getDailyRealizedPnl(accountId: string): number {
  const cur = dailyPnlCache.get(accountId);
  return cur && cur.day === utcDayKey() ? cur.realized : 0;
}

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

  // Portfolio-level guard: a global kill switch or a breached portfolio drawdown
  // stops every bot's next entry before any per-account checks run.
  const portfolio = await checkPortfolioRisk(account.userId);
  if (portfolio.blocked) {
    return { passed: false, reason: portfolio.reason ?? "PORTFOLIO_RISK_BLOCKED" };
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
  if (dailyLossPct > 0) {
    const startBalance = summary ? Number(summary.startBalance) || balance : balance;
    const lossThreshold = startBalance * (dailyLossPct / 100);
    // Fast in-memory guard first (reflects closes from this tick instantly),
    // then the authoritative DB summary.
    if (getDailyRealizedPnl(accountId) <= -lossThreshold) {
      return { passed: false, reason: "CIRCUIT_BREAKER_TRIPPED" };
    }
    if (summary && summary.netPnl.toNumber() <= -lossThreshold) {
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

  // Pre-flight: size only against a real, fresh balance and a measurable stop.
  // (`balance` is read fresh from the DB at the top of this function, so we are
  // never sizing off a stale snapshot — but we still guard the inputs.)
  if (!Number.isFinite(balance) || balance <= 0) {
    return { passed: false, reason: "INVALID_BALANCE" };
  }
  if (!Number.isFinite(signal.entryPrice) || signal.entryPrice <= 0) {
    return { passed: false, reason: "INVALID_ENTRY_PRICE" };
  }
  const stopDistance = Math.abs(signal.entryPrice - signal.stopPrice);
  if (!Number.isFinite(stopDistance) || stopDistance <= 0) {
    return { passed: false, reason: "INVALID_STOP_DISTANCE" };
  }

  // Position sizing from the strategy's configured risk per trade (default 1%,
  // hard ceiling 2%). Size is derived from the real dollar risk to the stop.
  const riskPct = clampNum(Number(params.riskPct) || 1, 0.1, 2) / 100;
  const riskAmount = balance * riskPct;
  let sizeUnits = riskAmount / stopDistance;

  // Concentration limit: no single position's notional may exceed 40% of equity.
  // A very tight stop would otherwise size into a hugely leveraged position
  // (small stop distance ⇒ large unit count); clamp the size down to the cap so
  // one instrument can never dominate the account.
  const MAX_CONCENTRATION = 0.4;
  let concentrationCapped = false;
  if (signal.entryPrice > 0) {
    const notional = sizeUnits * signal.entryPrice;
    const maxNotional = balance * MAX_CONCENTRATION;
    if (notional > maxNotional) {
      sizeUnits = maxNotional / signal.entryPrice;
      concentrationCapped = true;
    }
  }

  return { passed: true, sizeUnits, riskPct, concentrationCapped };
}
