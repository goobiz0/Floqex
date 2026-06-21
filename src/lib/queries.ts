import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import type { TradeRow, DailyRow } from "./metrics";
import { coerceStrategyParams, type StrategyParams } from "./strategy-schema";
import type { Plan } from "./plans";

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
  error: boolean;
};

export type TradeData = {
  hasAccount: boolean;
  trades: TradeRow[];
  summaries: DailyRow[];
  error: boolean;
};

const EMPTY_OVERVIEW: OverviewData = {
  account: null,
  bot: null,
  trades: [],
  summaries: [],
  openTrade: null,
  error: false,
};

const EMPTY_TRADES: TradeData = { hasAccount: false, trades: [], summaries: [], error: false };

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
  narrative: string | null;
  screenshotUrl: string | null;
  openedAt: Date;
  closedAt: Date | null;
};

type DbSummary = {
  date: Date;
  netPnl: unknown;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  startBalance: unknown;
  endBalance: unknown;
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
    narrative: t.narrative,
    screenshotUrl: t.screenshotUrl,
  };
}

function serializeSummary(s: DbSummary): DailyRow {
  return {
    date: s.date.toISOString().slice(0, 10),
    netPnl: num(s.netPnl),
    tradeCount: s.tradeCount,
    winCount: s.winCount,
    lossCount: s.lossCount,
    startBalance: num(s.startBalance),
    endBalance: num(s.endBalance),
  };
}

export async function getOverviewData(): Promise<OverviewData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_OVERVIEW;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: { take: 1, orderBy: { createdAt: "asc" }, include: { bot: true } },
      },
    });

    const account = user?.accounts[0];
    if (!account) return EMPTY_OVERVIEW;

    const [trades, summaries, openTrade] = await Promise.all([
      prisma.trade.findMany({
        where: { accountId: account.id, status: "CLOSED" },
        orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }],
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
      summaries: summaries.map(serializeSummary),
      openTrade: openTrade ? serializeTrade(openTrade) : null,
      error: false,
    };
  } catch {
    return { ...EMPTY_OVERVIEW, error: true };
  }
}

/** Closed trades + daily summaries for the user's account (journal/analytics/settings). */
export async function getTradeData(): Promise<TradeData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_TRADES;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { accounts: { take: 1, orderBy: { createdAt: "asc" } } },
    });

    const account = user?.accounts[0];
    if (!account) return EMPTY_TRADES;

    const [trades, summaries] = await Promise.all([
      prisma.trade.findMany({
        where: { accountId: account.id, status: "CLOSED" },
        orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }],
        take: 1000,
      }),
      prisma.dailySummary.findMany({
        where: { accountId: account.id },
        orderBy: { date: "asc" },
        take: 400,
      }),
    ]);

    return {
      hasAccount: true,
      trades: trades.map(serializeTrade),
      summaries: summaries.map(serializeSummary),
      error: false,
    };
  } catch {
    return { ...EMPTY_TRADES, error: true };
  }
}

export type AdjustmentRow = {
  id: string;
  parameter: string;
  paramKey: string | null;
  oldValue: string;
  newValue: string;
  source: "BOT" | "USER";
  status: "APPLIED" | "PENDING" | "REJECTED";
  reasoning: string | null;
  sampleSize: number | null;
  winRateDelta: number | null;
  confidence: number | null;
  createdAt: string;
};

export type StrategyData = {
  hasStrategy: boolean;
  params: StrategyParams | null;
  changeLog: AdjustmentRow[];
  pending: AdjustmentRow[];
  autoAdjustmentsUsed: number;
  error: boolean;
};

const EMPTY_STRATEGY: StrategyData = {
  hasStrategy: false,
  params: null,
  changeLog: [],
  pending: [],
  autoAdjustmentsUsed: 0,
  error: false,
};

type DbAdjustment = {
  id: string;
  parameter: string;
  paramKey: string | null;
  oldValue: string;
  newValue: string;
  source: string;
  status: string;
  reasoning: string | null;
  sampleSize: number | null;
  winRateDelta: unknown;
  confidence: unknown;
  createdAt: Date;
};

function serializeAdjustment(a: DbAdjustment): AdjustmentRow {
  return {
    id: a.id,
    parameter: a.parameter,
    paramKey: a.paramKey,
    oldValue: a.oldValue,
    newValue: a.newValue,
    source: a.source as AdjustmentRow["source"],
    status: a.status as AdjustmentRow["status"],
    reasoning: a.reasoning,
    sampleSize: a.sampleSize,
    winRateDelta: numOrNull(a.winRateDelta),
    confidence: numOrNull(a.confidence),
    createdAt: a.createdAt.toISOString(),
  };
}

/** The user's strategy params, change log, pending suggestions, and auto-adjust meter. */
export async function getStrategyData(): Promise<StrategyData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_STRATEGY;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: { take: 1, orderBy: { createdAt: "asc" }, include: { bot: true } },
        strategies: { take: 1, orderBy: { createdAt: "asc" } },
      },
    });

    const bot = user?.accounts[0]?.bot ?? null;
    const strategy = bot
      ? await prisma.strategy.findUnique({ where: { id: bot.strategyId } })
      : (user?.strategies[0] ?? null);
    if (!strategy) return EMPTY_STRATEGY;

    const adjustments = bot
      ? await prisma.botAdjustment.findMany({
          where: { botId: bot.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];

    return {
      hasStrategy: true,
      params: coerceStrategyParams(strategy.params),
      changeLog: adjustments.filter((a) => a.status !== "PENDING").map(serializeAdjustment),
      pending: adjustments.filter((a) => a.status === "PENDING").map(serializeAdjustment),
      autoAdjustmentsUsed: bot?.autoAdjustmentsUsed ?? 0,
      error: false,
    };
  } catch {
    return { ...EMPTY_STRATEGY, error: true };
  }
}

export type BillingData = {
  plan: Plan;
  status: string | null;
  currentPeriodEnd: string | null;
  accountCount: number;
  hasCustomer: boolean;
  error: boolean;
};

/** The signed-in user's current plan, subscription status, and account usage. */
export async function getBillingData(): Promise<BillingData> {
  const EMPTY: BillingData = {
    plan: "FREE",
    status: null,
    currentPeriodEnd: null,
    accountCount: 0,
    hasCustomer: false,
    error: false,
  };
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { _count: { select: { accounts: true } } },
    });
    if (!user) return EMPTY;
    return {
      plan: user.plan as Plan,
      status: user.stripeSubStatus,
      currentPeriodEnd: user.stripeCurrentPeriodEnd
        ? user.stripeCurrentPeriodEnd.toISOString()
        : null,
      accountCount: user._count.accounts,
      hasCustomer: Boolean(user.stripeCustomerId),
      error: false,
    };
  } catch {
    return { ...EMPTY, error: true };
  }
}

export type BotRow = {
  accountId: string;
  botId: string | null;
  nickname: string;
  broker: string;
  mode: string;
  status: "RUNNING" | "WAITING" | "STOPPED" | "NONE";
  strategyName: string | null;
  balance: number;
  todayPnl: number;
  spark: number[];
  lastHeartbeat: string | null;
};

export type BotsData = { bots: BotRow[]; plan: Plan; error: boolean };

/** Every account's bot with its status, strategy, today's P&L, and a sparkline. */
export async function getBotsData(): Promise<BotsData> {
  const EMPTY: BotsData = { bots: [], plan: "FREE", error: false };
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: {
          orderBy: { createdAt: "asc" },
          include: {
            bot: { include: { strategy: { select: { name: true } } } },
            summaries: { orderBy: { date: "desc" }, take: 14 },
          },
        },
      },
    });
    if (!user) return EMPTY;

    const todayKey = new Date().toISOString().slice(0, 10);
    const bots: BotRow[] = user.accounts.map((a) => {
      const today = a.summaries.find((s) => s.date.toISOString().slice(0, 10) === todayKey);
      return {
        accountId: a.id,
        botId: a.bot?.id ?? null,
        nickname: a.nickname,
        broker: a.broker,
        mode: a.mode,
        status: (a.bot?.status ?? "NONE") as BotRow["status"],
        strategyName: a.bot?.strategy?.name ?? null,
        balance: Number(a.balance),
        todayPnl: today ? Number(today.netPnl) : 0,
        spark: [...a.summaries].reverse().map((s) => Number(s.endBalance)),
        lastHeartbeat: a.bot?.lastHeartbeat?.toISOString() ?? null,
      };
    });
    return { bots, plan: user.plan as Plan, error: false };
  } catch {
    return { ...EMPTY, error: true };
  }
}
