import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import type { TradeRow, DailyRow } from "./metrics";

/**
 * Server-only data access for the dashboard, scoped to the signed-in Clerk user.
 * Prisma Decimal/Date values are serialized to plain numbers/ISO strings at this
 * boundary so they can cross into Client Components. Defensive by design: if the
 * database is unconfigured or unreachable, callers get EMPTY data and the UI
 * renders composed empty states rather than failing or showing fake numbers.
 */

export type OverviewAccount = {
  id: string;
  nickname: string;
  broker: string;
  mode: string;
  balance: number;
  currency: string;
};

export type OverviewBot = {
  status: "RUNNING" | "WAITING" | "STOPPED";
  lastHeartbeat: string | null;
};

export type OverviewData = {
  account: OverviewAccount | null;
  bot: OverviewBot | null;
  trades: TradeRow[];
  summaries: DailyRow[];
  openTrade: TradeRow | null;
};

const EMPTY: OverviewData = {
  account: null,
  bot: null,
  trades: [],
  summaries: [],
  openTrade: null,
};

function num(d: unknown): number {
  return Number(d as { toString(): string });
}
function numOrNull(d: unknown): number | null {
  return d === null || d === undefined ? null : Number(d as { toString(): string });
}

type DbTrade = {
  id: string;
  instrument: string;
  direction: string;
  session: string;
  status: string;
  entryPrice: unknown;
  exitPrice: unknown;
  stopPrice: unknown;
  targetPrice: unknown;
  netPnl: unknown;
  grossPnl: unknown;
  rMultiple: unknown;
  openedAt: Date;
  closedAt: Date | null;
};

function serializeTrade(t: DbTrade): TradeRow {
  return {
    id: t.id,
    instrument: t.instrument,
    direction: t.direction as TradeRow["direction"],
    session: t.session as TradeRow["session"],
    status: t.status as TradeRow["status"],
    entryPrice: num(t.entryPrice),
    exitPrice: numOrNull(t.exitPrice),
    stopPrice: num(t.stopPrice),
    targetPrice: num(t.targetPrice),
    netPnl: numOrNull(t.netPnl),
    grossPnl: numOrNull(t.grossPnl),
    rMultiple: numOrNull(t.rMultiple),
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
  };
}

export async function getOverviewData(): Promise<OverviewData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: { take: 1, orderBy: { createdAt: "asc" }, include: { bot: true } },
      },
    });

    const account = user?.accounts[0];
    if (!account) return EMPTY;

    const [trades, summaries, openTrade] = await Promise.all([
      prisma.trade.findMany({
        where: { accountId: account.id, status: "CLOSED" },
        orderBy: { openedAt: "desc" },
        take: 250,
      }),
      prisma.dailySummary.findMany({
        where: { accountId: account.id },
        orderBy: { date: "asc" },
        take: 400,
      }),
      prisma.trade.findFirst({
        where: { accountId: account.id, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      }),
    ]);

    return {
      account: {
        id: account.id,
        nickname: account.nickname,
        broker: account.broker,
        mode: account.mode,
        balance: num(account.balance),
        currency: account.currency,
      },
      bot: account.bot
        ? {
            status: account.bot.status as OverviewBot["status"],
            lastHeartbeat: account.bot.lastHeartbeat
              ? account.bot.lastHeartbeat.toISOString()
              : null,
          }
        : null,
      trades: trades.map(serializeTrade),
      summaries: summaries.map(
        (s): DailyRow => ({
          date: s.date.toISOString().slice(0, 10),
          netPnl: num(s.netPnl),
          tradeCount: s.tradeCount,
          winCount: s.winCount,
          lossCount: s.lossCount,
          startBalance: num(s.startBalance),
          endBalance: num(s.endBalance),
        }),
      ),
      openTrade: openTrade ? serializeTrade(openTrade) : null,
    };
  } catch {
    return EMPTY;
  }
}
