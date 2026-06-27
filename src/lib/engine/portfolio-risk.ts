// Portfolio Risk Command Center engine. Per-account risk (risk-engine.ts) is not
// enough once a trader runs a book of bots: positions correlate, exposure
// concentrates, and a bad day compounds across accounts. This module lifts risk
// to the portfolio level, exposes the picture the command center renders, and
// provides the cheap guard the live engine calls before every entry.
//
// The math helpers are pure and unit-tested; the aggregation reads real trades
// and daily summaries (no fabricated numbers).

import { prisma } from "@/lib/db";
import {
  correlationMatrix,
  concentration,
  evaluateBreaches,
  type ConcentrationSlice,
  type PortfolioPolicy,
  type PortfolioBreach,
} from "./portfolio-risk-math";

const safe = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback);

// Re-export the pure math so callers can import everything from one place.
export {
  pearson,
  correlationMatrix,
  concentration,
  evaluateBreaches,
  type ConcentrationSlice,
  type PortfolioPolicy,
  type PortfolioBreach,
} from "./portfolio-risk-math";

// ───────────────────────── Live guard (hot path) ────────────────────────────

/**
 * Cheap pre-trade check used by validateRisk on every entry. Reads only the two
 * fields it needs plus today's summaries, so it adds minimal latency. Returns a
 * machine reason so the engine can log a precise RISK event.
 */
export async function checkPortfolioRisk(userId: string): Promise<{ blocked: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tradingHalted: true, maxPortfolioDrawdown: true },
  });
  if (!user) return { blocked: false };
  if (user.tradingHalted) return { blocked: true, reason: "PORTFOLIO_HALTED" };

  if (user.maxPortfolioDrawdown != null) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const summaries = await prisma.dailySummary.findMany({
      where: { date: today, account: { userId } },
      select: { netPnl: true },
    });
    const todayNet = summaries.reduce((a, s) => a + Number(s.netPnl), 0);
    if (todayNet < -Math.abs(Number(user.maxPortfolioDrawdown))) {
      return { blocked: true, reason: "PORTFOLIO_DRAWDOWN" };
    }
  }
  return { blocked: false };
}

// ───────────────────────── Full state (command center) ──────────────────────

export type BotExposure = {
  botId: string;
  botName: string;
  accountNickname: string;
  instrument: string;
  mode: string;
  status: string;
  openTrades: number;
  openNotional: number;
  riskWeight: number | null;
};

export type PortfolioState = {
  totalEquity: number;
  liveEquity: number;
  totalOpenNotional: number;
  grossExposurePct: number;
  todayNetPnl: number;
  todayDrawdownPct: number;
  bots: BotExposure[];
  byInstrument: ConcentrationSlice[];
  bySession: ConcentrationSlice[];
  correlation: { labels: string[]; matrix: number[][] };
  policy: PortfolioPolicy;
  breaches: PortfolioBreach[];
  liveBotCount: number;
};

const CORR_DAYS = 30;

/** Aggregate everything the Portfolio Risk Command Center renders. */
export async function getPortfolioState(userId: string): Promise<PortfolioState> {
  const [user, accounts, openTrades] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { tradingHalted: true, maxPortfolioDrawdown: true } }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, nickname: true, mode: true, balance: true, bot: { select: { id: true, name: true, status: true, riskWeight: true } } },
    }),
    prisma.trade.findMany({
      where: { status: "OPEN", account: { userId } },
      select: { accountId: true, instrument: true, session: true, entryPrice: true, sizeUnits: true },
    }),
  ]);

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const totalEquity = accounts.reduce((a, x) => a + Number(x.balance), 0);
  const liveEquity = accounts.filter((a) => a.mode === "LIVE").reduce((a, x) => a + Number(x.balance), 0);

  // Open exposure per account and the concentration views.
  const notionalItems: { key: string; notional: number }[] = [];
  const sessionItems: { key: string; notional: number }[] = [];
  const openByAccount = new Map<string, { count: number; notional: number; instrument: string }>();
  for (const t of openTrades) {
    const notional = Number(t.entryPrice) * Number(t.sizeUnits);
    notionalItems.push({ key: t.instrument, notional });
    sessionItems.push({ key: t.session, notional });
    const cur = openByAccount.get(t.accountId) ?? { count: 0, notional: 0, instrument: t.instrument };
    cur.count += 1;
    cur.notional += notional;
    openByAccount.set(t.accountId, cur);
  }

  const totalOpenNotional = notionalItems.reduce((a, x) => a + x.notional, 0);

  const bots: BotExposure[] = accounts
    .filter((a) => a.bot)
    .map((a) => {
      const open = openByAccount.get(a.id);
      return {
        botId: a.bot!.id,
        botName: a.bot!.name,
        accountNickname: a.nickname,
        instrument: open?.instrument ?? "-",
        mode: a.mode,
        status: a.bot!.status,
        openTrades: open?.count ?? 0,
        openNotional: Math.round(open?.notional ?? 0),
        riskWeight: a.bot!.riskWeight != null ? Number(a.bot!.riskWeight) : null,
      };
    });

  // Today's combined P&L and drawdown.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const summaries = await prisma.dailySummary.findMany({
    where: { date: today, account: { userId } },
    select: { netPnl: true, startBalance: true },
  });
  const todayNetPnl = summaries.reduce((a, s) => a + Number(s.netPnl), 0);
  const startEquity = summaries.reduce((a, s) => a + Number(s.startBalance), 0) || totalEquity || 1;
  const todayDrawdownPct = todayNetPnl < 0 ? (Math.abs(todayNetPnl) / startEquity) * 100 : 0;

  // Correlation between accounts from their daily return series.
  const since = new Date();
  since.setDate(since.getDate() - CORR_DAYS);
  const history = await prisma.dailySummary.findMany({
    where: { date: { gte: since }, account: { userId } },
    select: { accountId: true, date: true, netPnl: true, startBalance: true },
    orderBy: { date: "asc" },
  });
  const dateKeys = [...new Set(history.map((h) => h.date.toISOString().slice(0, 10)))].sort();
  const accountsWithHistory = [...new Set(history.map((h) => h.accountId))];
  const labels: string[] = [];
  const series: number[][] = [];
  for (const accId of accountsWithHistory) {
    const acc = accountById.get(accId);
    if (!acc) continue;
    const byDate = new Map(history.filter((h) => h.accountId === accId).map((h) => [h.date.toISOString().slice(0, 10), h]));
    const ret = dateKeys.map((d) => {
      const row = byDate.get(d);
      if (!row) return 0;
      const start = Number(row.startBalance) || 1;
      return safe(Number(row.netPnl) / start);
    });
    labels.push(acc.nickname);
    series.push(ret);
  }

  const byInstrument = concentration(notionalItems);
  const bySession = concentration(sessionItems);
  const policy: PortfolioPolicy = {
    maxPortfolioDrawdown: user?.maxPortfolioDrawdown != null ? Number(user.maxPortfolioDrawdown) : null,
    tradingHalted: Boolean(user?.tradingHalted),
  };

  return {
    totalEquity: Math.round(totalEquity),
    liveEquity: Math.round(liveEquity),
    totalOpenNotional: Math.round(totalOpenNotional),
    grossExposurePct: totalEquity > 0 ? Math.round((totalOpenNotional / totalEquity) * 1000) / 10 : 0,
    todayNetPnl: Math.round(todayNetPnl),
    todayDrawdownPct: Math.round(todayDrawdownPct * 10) / 10,
    bots,
    byInstrument,
    bySession,
    correlation: { labels, matrix: correlationMatrix(series) },
    policy,
    breaches: evaluateBreaches({ todayNetPnl, concentration: byInstrument }, policy),
    liveBotCount: bots.filter((b) => b.mode === "LIVE" && b.status === "RUNNING").length,
  };
}
