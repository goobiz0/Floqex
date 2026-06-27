import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { summaryMetrics, equitySeries, maxDrawdown, type DailyRow, type TradeRow } from "./metrics";
export type { DailyRow, TradeRow };
import { coerceStrategyParams, type StrategyParams } from "./strategy-schema";
import type { Plan } from "./plans";
import { getMarketForInstrument, type MarketKind } from "./market";

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
  openTrades: TradeRow[];
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
  openTrades: [],
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
  sizeUnits: unknown;
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
    sizeUnits: num(t.sizeUnits),
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

    const [trades, summaries, openTrades, agentEvents] = await Promise.all([
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
      prisma.trade.findMany({
        where: { accountId: account.id, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      }),
      getAgentEvents(account.id),
    ]);
    const openTrade = openTrades[0] ?? null;

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
      openTrades: openTrades.map(serializeTrade),
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
  id: string;
  name: string;
  status: "RUNNING" | "WAITING" | "STOPPED";
  edgeDecayPaused: boolean;
  edgeDecayThreshold: number | null;
  isPublic: boolean;
  strategyName: string;
  strategyId: string;
  lastHeartbeat: string | null;
  accountId: string | null;
  accountNickname: string | null;
  accountBroker: string | null;
  accountMode: string | null;
  balance: number | null;
  todayPnl: number | null;
  spark: number[];
};

export type AvailableAccount = {
  id: string;
  nickname: string;
  broker: string;
  mode: string;
};

export type BotsData = { 
  bots: BotRow[]; 
  availableAccounts: AvailableAccount[];
  plan: Plan; 
  error: boolean 
};

/** Every bot the user owns, and accounts available for connection. */
export async function getBotsData(): Promise<BotsData> {
  const EMPTY: BotsData = { bots: [], availableAccounts: [], plan: "FREE", error: false };
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY;
    
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: {
          include: {
            bot: true,
            summaries: { orderBy: { date: "desc" }, take: 14 },
          },
        },
        bots: {
          orderBy: { createdAt: "desc" },
          include: {
            strategy: { select: { name: true } },
            account: {
              include: {
                summaries: { orderBy: { date: "desc" }, take: 14 },
              },
            },
          },
        },
      },
    });
    if (!user) return EMPTY;

    const todayKey = new Date().toISOString().slice(0, 10);
    
    const bots: BotRow[] = user.bots.map((b) => {
      const a = b.account;
      const today = a ? a.summaries.find((s) => s.date.toISOString().slice(0, 10) === todayKey) : null;
      
      return {
        id: b.id,
        name: b.name,
        status: b.status as BotRow["status"],
        edgeDecayPaused: b.edgeDecayPaused,
        edgeDecayThreshold: b.edgeDecayThreshold ? Number(b.edgeDecayThreshold) : null,
        isPublic: b.isPublic,
        strategyName: b.strategy.name,
        strategyId: b.strategyId,
        lastHeartbeat: b.lastHeartbeat?.toISOString() ?? null,
        accountId: a?.id ?? null,
        accountNickname: a?.nickname ?? null,
        accountBroker: a?.broker ?? null,
        accountMode: a?.mode ?? null,
        balance: a ? Number(a.balance) : null,
        todayPnl: today ? Number(today.netPnl) : null,
        spark: a ? [...a.summaries].reverse().map((s) => Number(s.endBalance)) : [],
      };
    });

    const availableAccounts = user.accounts
      .filter((a) => !a.bot)
      .map((a) => ({
        id: a.id,
        nickname: a.nickname,
        broker: a.broker,
        mode: a.mode,
      }));

    return { bots, availableAccounts, plan: user.plan as Plan, error: false };
  } catch (err) {
    console.error("getBotsData error", err);
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

/**
 * One account's slice of activity in a single instrument. When an asset is
 * traded across multiple bots/accounts, the per-stock view splits the numbers
 * out by account so each account's own activity is visible.
 */
export type AssetAccountActivity = {
  accountId: string;
  nickname: string;
  broker: string;
  mode: string;          // PAPER | LIVE
  executions: number;    // total fills (trade rows) on this account
  closedCount: number;
  openCount: number;
  winCount: number;
  realizedPnl: number;
  netUnits: number;      // signed open holding on this account
};

export type InstrumentActivity = {
  instrument: string;
  trades: TradeRow[];
  openTrades: TradeRow[];
  netUnits: number;       // signed holding: +long, -short
  realizedPnl: number;    // sum of closed netPnl
  tradeCount: number;     // closed count (win-rate denominator)
  executions: number;     // total fills (all trade rows)
  winCount: number;
  accounts: AssetAccountActivity[];  // per-account split, descending by executions
  hasAccount: boolean;
};

/**
 * What the user's bots have done with a specific instrument: open positions
 * (current holding), recent fills (buys/sells), realized P&L, and a per-account
 * breakdown. Powers the per-stock activity panel in the markets view.
 */
export async function getInstrumentActivity(instrument: string): Promise<InstrumentActivity> {
  const sym = instrument.trim().toUpperCase();
  const EMPTY: InstrumentActivity = {
    instrument: sym, trades: [], openTrades: [], netUnits: 0, realizedPnl: 0,
    tradeCount: 0, executions: 0, winCount: 0, accounts: [], hasAccount: false,
  };
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { accounts: { select: { id: true, nickname: true, broker: true, mode: true } } },
    });
    const accounts = user?.accounts ?? [];
    if (accounts.length === 0) return EMPTY;
    const accMeta = new Map(accounts.map((a) => [a.id, a]));

    const rows = await prisma.trade.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) }, instrument: sym },
      orderBy: [{ openedAt: "desc" }],
    });

    const trades = rows.map(serializeTrade);
    const openTrades = trades.filter((t) => t.status === "OPEN");
    const closed = trades.filter((t) => t.status === "CLOSED");
    const sizeById = new Map(rows.map((r) => [r.id, num(r.sizeUnits)]));
    const signedUnits = (t: TradeRow) =>
      (t.direction === "LONG" ? 1 : -1) * Math.abs(sizeById.get(t.id) ?? 0);
    const netUnits = openTrades.reduce((acc, t) => acc + signedUnits(t), 0);

    // Split the same instrument's activity by account/bot.
    const byAccount = new Map<string, AssetAccountActivity>();
    for (const r of rows) {
      const meta = accMeta.get(r.accountId);
      if (!meta) continue;
      let a = byAccount.get(r.accountId);
      if (!a) {
        a = {
          accountId: meta.id, nickname: meta.nickname, broker: meta.broker, mode: meta.mode,
          executions: 0, closedCount: 0, openCount: 0, winCount: 0, realizedPnl: 0, netUnits: 0,
        };
        byAccount.set(r.accountId, a);
      }
      a.executions += 1;
      if (r.status === "CLOSED") {
        a.closedCount += 1;
        const pnl = numOrNull(r.netPnl) ?? 0;
        a.realizedPnl += pnl;
        if (pnl > 0) a.winCount += 1;
      } else {
        a.openCount += 1;
        a.netUnits += (r.direction === "LONG" ? 1 : -1) * Math.abs(num(r.sizeUnits));
      }
    }

    return {
      instrument: sym,
      trades,
      openTrades,
      netUnits,
      realizedPnl: closed.reduce((s, t) => s + (t.netPnl ?? 0), 0),
      tradeCount: closed.length,
      executions: rows.length,
      winCount: closed.filter((t) => (t.netPnl ?? 0) > 0).length,
      accounts: Array.from(byAccount.values()).sort((x, y) => y.executions - x.executions),
      hasAccount: true,
    };
  } catch {
    return EMPTY;
  }
}

export type AssetActivity = {
  instrument: string;
  market: MarketKind;
  executions: number;     // total fills (trade rows) for this asset
  closedCount: number;
  openCount: number;
  winCount: number;
  realizedPnl: number;
  activityPct: number;    // share of all fills across every asset (0-100)
  netUnits: number;       // signed open holding
  lastTradedAt: string | null;
  accounts: AssetAccountActivity[];  // per-account split, descending by executions
};

export type BotActivityOverview = {
  assets: AssetActivity[];       // descending by executions
  totalExecutions: number;
  totalRealizedPnl: number;
  instrumentCount: number;
  hasAccount: boolean;
  error: boolean;
};

/**
 * Every instrument the user's bots have traded, ranked by activity. Powers the
 * markets landing view (shown before an asset is picked) and the side panel once
 * one is selected: activity share, realized P&L, fill count, win rate, and a
 * per-account split for assets traded across multiple bots/accounts.
 */
export async function getBotActivityOverview(): Promise<BotActivityOverview> {
  const EMPTY: BotActivityOverview = {
    assets: [], totalExecutions: 0, totalRealizedPnl: 0, instrumentCount: 0,
    hasAccount: false, error: false,
  };
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { accounts: { select: { id: true, nickname: true, broker: true, mode: true } } },
    });
    const accounts = user?.accounts ?? [];
    if (accounts.length === 0) return EMPTY;
    const accMeta = new Map(accounts.map((a) => [a.id, a]));

    const rows = await prisma.trade.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) } },
      select: {
        accountId: true, instrument: true, direction: true, status: true,
        netPnl: true, sizeUnits: true, openedAt: true,
      },
      orderBy: { openedAt: "desc" },
    });
    if (rows.length === 0) return { ...EMPTY, hasAccount: true };

    type Bucket = AssetActivity & { _accts: Map<string, AssetAccountActivity> };
    const byInstrument = new Map<string, Bucket>();
    let totalRealizedPnl = 0;

    for (const r of rows) {
      const sym = r.instrument.toUpperCase();
      let b = byInstrument.get(sym);
      if (!b) {
        b = {
          instrument: sym, market: getMarketForInstrument(sym),
          executions: 0, closedCount: 0, openCount: 0, winCount: 0,
          realizedPnl: 0, activityPct: 0, netUnits: 0, lastTradedAt: null,
          accounts: [], _accts: new Map(),
        };
        byInstrument.set(sym, b);
      }
      b.executions += 1;
      const openedAt = r.openedAt.toISOString();
      if (!b.lastTradedAt || openedAt > b.lastTradedAt) b.lastTradedAt = openedAt;

      const meta = accMeta.get(r.accountId);
      let a = b._accts.get(r.accountId);
      if (!a && meta) {
        a = {
          accountId: meta.id, nickname: meta.nickname, broker: meta.broker, mode: meta.mode,
          executions: 0, closedCount: 0, openCount: 0, winCount: 0, realizedPnl: 0, netUnits: 0,
        };
        b._accts.set(r.accountId, a);
      }
      if (a) a.executions += 1;

      if (r.status === "CLOSED") {
        b.closedCount += 1;
        const pnl = numOrNull(r.netPnl) ?? 0;
        b.realizedPnl += pnl;
        totalRealizedPnl += pnl;
        if (pnl > 0) b.winCount += 1;
        if (a) {
          a.closedCount += 1;
          a.realizedPnl += pnl;
          if (pnl > 0) a.winCount += 1;
        }
      } else {
        b.openCount += 1;
        const signed = (r.direction === "LONG" ? 1 : -1) * Math.abs(num(r.sizeUnits));
        b.netUnits += signed;
        if (a) {
          a.openCount += 1;
          a.netUnits += signed;
        }
      }
    }

    const totalExecutions = rows.length;
    const assets: AssetActivity[] = Array.from(byInstrument.values())
      .map(({ _accts, ...rest }) => ({
        ...rest,
        activityPct: totalExecutions > 0 ? (rest.executions / totalExecutions) * 100 : 0,
        accounts: Array.from(_accts.values()).sort((x, y) => y.executions - x.executions),
      }))
      .sort((x, y) => y.executions - x.executions || y.realizedPnl - x.realizedPnl);

    return {
      assets,
      totalExecutions,
      totalRealizedPnl,
      instrumentCount: assets.length,
      hasAccount: true,
      error: false,
    };
  } catch (err) {
    console.error("Error in getBotActivityOverview:", err);
    return { ...EMPTY, error: true };
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
