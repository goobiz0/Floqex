import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { summaryMetrics, equitySeries, maxDrawdown, type DailyRow, type TradeRow } from "./metrics";
export type { DailyRow, TradeRow };
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

export type AgentEventKind = "INFO" | "SIGNAL" | "TRADE" | "RISK" | "NEWS" | "ADJUST";

export type AgentEventRow = {
  id: string;
  /** Stable HH:MM:SS (UTC) so the client never disagrees with the server. */
  t: string;
  kind: AgentEventKind;
  message: string;
};

export type OverviewData = {
  account: OverviewAccount | null;
  bot: OverviewBot | null;
  trades: TradeRow[];
  summaries: DailyRow[];
  openTrade: TradeRow | null;
  agentEvents: AgentEventRow[];
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
  agentEvents: [],
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

/**
 * Latest narrated decisions for the live agent feed, oldest-first for a
 * terminal-log read. Guarded on its own so an unmigrated agent_events table
 * degrades to an empty feed rather than taking down the whole overview.
 */
async function getAgentEvents(accountId: string): Promise<AgentEventRow[]> {
  try {
    const rows = await prisma.agentEvent.findMany({
      where: { accountId },
      orderBy: { ts: "desc" },
      take: 40,
    });
    return rows
      .reverse()
      .map((e) => ({
        id: e.id,
        t: e.ts.toISOString().slice(11, 19),
        kind: e.kind as AgentEventKind,
        message: e.message,
      }));
  } catch {
    return [];
  }
}

export async function getOverviewData(accountId?: string): Promise<OverviewData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_OVERVIEW;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: { 
          orderBy: { createdAt: "asc" }, 
          include: { bot: true } 
        },
      },
    });

    if (!user || user.accounts.length === 0) return EMPTY_OVERVIEW;

    const account = accountId 
      ? user.accounts.find(a => a.id === accountId) || user.accounts[0]
      : user.accounts[0];

    if (!account) return EMPTY_OVERVIEW;

    const [trades, summaries, openTrade, agentEvents] = await Promise.all([
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
      getAgentEvents(account.id),
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
      agentEvents,
      error: false,
    };
  } catch (err) {
    console.error("Error in getOverviewData:", err);
    return { ...EMPTY_OVERVIEW, error: true };
  }
}

/** Closed trades + daily summaries for the user's account (journal/analytics/settings). */
export async function getTradeData(accountId?: string): Promise<TradeData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_TRADES;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { accounts: { orderBy: { createdAt: "asc" } } },
    });

    if (!user || user.accounts.length === 0) return EMPTY_TRADES;

    const account = accountId 
      ? user.accounts.find(a => a.id === accountId) || user.accounts[0]
      : user.accounts[0];

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
  accountId: string | null;
  strategyId: string | null;
  params: StrategyParams | null;
  changeLog: AdjustmentRow[];
  pending: AdjustmentRow[];
  autoAdjustmentsUsed: number;
  plan: Plan;
  error: boolean;
};

const EMPTY_STRATEGY: StrategyData = {
  hasStrategy: false,
  accountId: null,
  strategyId: null,
  params: null,
  changeLog: [],
  pending: [],
  autoAdjustmentsUsed: 0,
  plan: "FREE",
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
export async function getStrategyData(accountId?: string, strategyId?: string): Promise<StrategyData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_STRATEGY;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: { orderBy: { createdAt: "asc" }, include: { bot: true } },
        strategies: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!user) return EMPTY_STRATEGY;

    // A botless strategy opened straight from the hub is addressed by id and has
    // no account context; otherwise resolve via the edited account's bot.
    const explicitStrategy = strategyId
      ? user.strategies.find((s) => s.id === strategyId) ?? null
      : null;

    const account = explicitStrategy
      ? null
      : accountId
        ? user.accounts.find((a) => a.id === accountId) || user.accounts[0]
        : user.accounts[0];

    const bot = account?.bot ?? null;
    const strategy = explicitStrategy
      ? explicitStrategy
      : bot
        ? await prisma.strategy.findUnique({ where: { id: bot.strategyId } })
        : (user.strategies[0] ?? null);
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
      accountId: account?.id ?? null,
      strategyId: strategy.id,
      params: coerceStrategyParams(strategy.params),
      changeLog: adjustments.filter((a) => a.status !== "PENDING").map(serializeAdjustment),
      pending: adjustments.filter((a) => a.status === "PENDING").map(serializeAdjustment),
      autoAdjustmentsUsed: bot?.autoAdjustmentsUsed ?? 0,
      plan: (user.plan as Plan) || "FREE",
      error: false,
    };
  } catch (err) {
    console.error("Error in getStrategyData:", err);
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

/**
 * Real engine activity for the current calendar month: the number of agent
 * events (decisions, signals, trades, risk checks) the user's bots produced.
 * Replaces the previously hardcoded usage meter on the billing page.
 */
export async function getMonthlyUsage(): Promise<number> {
  try {
    const { userId } = await auth();
    if (!userId) return 0;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { accounts: { select: { id: true } } },
    });
    const accountIds = user?.accounts.map((a) => a.id) ?? [];
    if (accountIds.length === 0) return 0;
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    return prisma.agentEvent.count({ where: { accountId: { in: accountIds }, ts: { gte: start } } });
  } catch {
    return 0;
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

export type NotificationRow = {
  id: string;
  t: string; // ISO; formatted client-side in the (interaction-only) dropdown
  kind: AgentEventKind;
  message: string;
  account: string;
};

/** Recent agent events across all the user's accounts — the real notification feed. */
export async function getRecentNotifications(): Promise<NotificationRow[]> {
  try {
    const { userId } = await auth();
    if (!userId) return [];
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { accounts: { select: { id: true, nickname: true } } },
    });
    const accounts = user?.accounts ?? [];
    if (!accounts.length) return [];
    const nameById = new Map(accounts.map((a) => [a.id, a.nickname]));
    const rows = await prisma.agentEvent.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) } },
      orderBy: { ts: "desc" },
      take: 12,
    });
    return rows.map((e) => ({
      id: e.id,
      t: e.ts.toISOString(),
      kind: e.kind as AgentEventKind,
      message: e.message,
      account: nameById.get(e.accountId) ?? "",
    }));
  } catch {
    return [];
  }
}

export type InstrumentActivity = {
  instrument: string;
  trades: TradeRow[];
  openTrades: TradeRow[];
  netUnits: number;       // signed holding: +long, -short
  realizedPnl: number;    // sum of closed netPnl
  tradeCount: number;
  winCount: number;
  hasAccount: boolean;
};

/**
 * What the user's bots have done with a specific instrument: open positions
 * (current holding), recent fills (buys/sells), and realized P&L. Powers the
 * per-stock activity panel in the markets/stock-search view.
 */
export async function getInstrumentActivity(instrument: string): Promise<InstrumentActivity> {
  const sym = instrument.trim().toUpperCase();
  const EMPTY: InstrumentActivity = {
    instrument: sym, trades: [], openTrades: [], netUnits: 0, realizedPnl: 0,
    tradeCount: 0, winCount: 0, hasAccount: false,
  };
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { accounts: { select: { id: true } } },
    });
    const accountIds = user?.accounts.map((a) => a.id) ?? [];
    if (accountIds.length === 0) return EMPTY;

    const rows = await prisma.trade.findMany({
      where: { accountId: { in: accountIds }, instrument: sym },
      orderBy: [{ openedAt: "desc" }],
      take: 200,
    });

    const trades = rows.map(serializeTrade);
    const openTrades = trades.filter((t) => t.status === "OPEN");
    const closed = trades.filter((t) => t.status === "CLOSED");
    const netUnits = openTrades.reduce(
      (acc, t) => acc + (t.direction === "LONG" ? 1 : -1) * Math.abs(num(rows.find((r) => r.id === t.id)?.sizeUnits)),
      0,
    );
    return {
      instrument: sym,
      trades,
      openTrades,
      netUnits,
      realizedPnl: closed.reduce((s, t) => s + (t.netPnl ?? 0), 0),
      tradeCount: closed.length,
      winCount: closed.filter((t) => (t.netPnl ?? 0) > 0).length,
      hasAccount: true,
    };
  } catch {
    return EMPTY;
  }
}

export type NavAccount = { id: string; nickname: string; balance: number; mode: string };

/** Minimal account list for the sidebar accounts section (real balances). */
export async function getNavAccounts(): Promise<NavAccount[]> {
  try {
    const { userId } = await auth();
    if (!userId) return [];
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        accounts: {
          orderBy: { createdAt: "asc" },
          select: { id: true, nickname: true, balance: true, mode: true },
        },
      },
    });
    return (user?.accounts ?? []).map((a) => ({
      id: a.id,
      nickname: a.nickname,
      balance: num(a.balance),
      mode: a.mode,
    }));
  } catch {
    return [];
  }
}

export type DemoPreview = {
  balance: number;
  changePct: number | null;
  changeAmount: number | null;
  winRate: number;
  profitFactor: number | null; // null when undefined (no losses yet)
  maxDrawdownPct: number;
  spark: number[];
  botRunning: boolean;
};

/**
 * Public, read-only aggregates for the marketing preview — scoped to the single
 * fixed demo account (no auth, no PII, equity/trade aggregates only, per the
 * security model). Returns null when the demo isn't seeded so the marketing
 * page can fall back to a labelled sample rather than fabricating numbers.
 */
export async function getDemoPreview(): Promise<DemoPreview | null> {
  try {
    const clerkId = process.env.DEMO_CLERK_ID || "demo_floqex_account";
    const account = await prisma.account.findFirst({
      where: { user: { clerkId } },
      include: {
        bot: { select: { status: true } },
        summaries: { orderBy: { date: "asc" }, take: 120 },
        trades: { where: { status: "CLOSED" }, take: 1000 },
      },
    });
    if (!account || account.summaries.length === 0) return null;

    const summaries = account.summaries.map(serializeSummary);
    const trades = account.trades.map(serializeTrade);
    const m = summaryMetrics(trades);
    const series = equitySeries(summaries);
    const dd = maxDrawdown(series);
    const last = summaries[summaries.length - 1];

    return {
      balance: num(account.balance),
      changePct: last && last.startBalance ? (last.netPnl / last.startBalance) * 100 : null,
      changeAmount: last ? last.netPnl : null,
      winRate: m.winRate,
      profitFactor: Number.isFinite(m.profitFactor) ? m.profitFactor : null,
      maxDrawdownPct: dd.pct,
      spark: series.map((p) => p.equity),
      botRunning: account.bot?.status === "RUNNING",
    };
  } catch {
    return null;
  }
}
