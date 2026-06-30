import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { summaryMetrics, equitySeries, maxDrawdown, type DailyRow, type TradeRow, type ExecRow, type HeartbeatRow } from "./metrics";
export type { DailyRow, TradeRow };
import { coerceStrategyParams, type StrategyParams } from "./strategy-schema";
import { PLANS, type Plan } from "./plans";
import type { CopySizingMode, CopyLinkStatus, CopyFilterMode } from "./copy-trading";
import { getMarketForInstrument, type MarketKind } from "./market";
import { getForwardTests, type ForwardTestRow } from "./engine/forward-test";
export type { ForwardTestRow };

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
  userPlan: Plan;
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
  userPlan: "FREE",
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
      userPlan: (user.plan as Plan) || "FREE",
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

export type ExecutionData = {
  hasAccount: boolean;
  fills: ExecRow[];
  missedSignals: number;
  heartbeats: HeartbeatRow[];
  error: boolean;
};

const EMPTY_EXECUTION: ExecutionData = { hasAccount: false, fills: [], missedSignals: 0, heartbeats: [], error: false };

/**
 * Execution-quality inputs for the selected account: filled trades (intended vs
 * actual), the count of blocked/missed signals from the agent feed, and the
 * bot's heartbeat. Account resolution matches getTradeData so the Analytics page
 * stays consistent.
 */
export async function getExecutionData(accountId?: string): Promise<ExecutionData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_EXECUTION;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { accounts: { orderBy: { createdAt: "asc" } } },
    });
    if (!user || user.accounts.length === 0) return EMPTY_EXECUTION;

    const account = accountId ? user.accounts.find((a) => a.id === accountId) || user.accounts[0] : user.accounts[0];
    if (!account) return EMPTY_EXECUTION;

    const [fills, missedSignals, bot] = await Promise.all([
      prisma.trade.findMany({
        where: { accountId: account.id, status: "CLOSED" },
        orderBy: { closedAt: "desc" },
        take: 1000,
        select: { entrySlippageBps: true, exitSlippageBps: true, entryLatencyMs: true },
      }),
      prisma.agentEvent.count({ where: { accountId: account.id, kind: "RISK" } }),
      prisma.bot.findUnique({ where: { accountId: account.id }, select: { status: true, lastHeartbeat: true } }),
    ]);

    return {
      hasAccount: true,
      fills: fills.map((f) => ({
        entrySlippageBps: numOrNull(f.entrySlippageBps),
        exitSlippageBps: numOrNull(f.exitSlippageBps),
        entryLatencyMs: f.entryLatencyMs ?? null,
      })),
      missedSignals,
      heartbeats: bot ? [{ status: bot.status, lastHeartbeat: bot.lastHeartbeat ? bot.lastHeartbeat.toISOString() : null }] : [],
      error: false,
    };
  } catch {
    return { ...EMPTY_EXECUTION, error: true };
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
  forwardTests: ForwardTestRow[];
  plan: Plan;
  error: boolean;
};

/** Every bot the user owns, and accounts available for connection. */
export async function getBotsData(): Promise<BotsData> {
  const EMPTY: BotsData = { bots: [], availableAccounts: [], forwardTests: [], plan: "FREE", error: false };
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

    // Forward tests evaluated fresh (persists any RUNNING→PASSED/FAILED transitions).
    const forwardTests = await getForwardTests(user.id).catch(() => []);

    return { bots, availableAccounts, forwardTests, plan: user.plan as Plan, error: false };
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

// ─────────────────────── Copy trading (paid) ────────────────────

export type CopyAccountLite = {
  id: string;
  nickname: string;
  broker: string;
  mode: string; // PAPER | LIVE
  balance: number;
  currency: string;
  hasBot: boolean;
};

/** Realized performance of a single link, derived from its copy events. */
export type CopyLinkAnalytics = {
  closed: number; // closed copied trades
  wins: number; // closed with positive pnl
  winRate: number | null; // 0..1, null when nothing has closed yet
  realizedPnl: number; // all-time realized on this link
  todayPnl: number; // realized today (UTC), drives the daily-loss meter
  openCopies: number; // copied trades still open
};

export type CopyLinkRow = {
  id: string;
  status: CopyLinkStatus;
  sizingMode: CopySizingMode;
  multiplier: number;
  fixedUnits: number | null;
  maxRiskPct: number | null;
  minUnits: number | null;
  maxUnits: number | null;
  symbolFilter: string | null;
  symbolFilterMode: CopyFilterMode;
  maxDailyLossPct: number | null;
  pausedReason: string | null;
  reverse: boolean;
  copyOpen: boolean;
  copyClose: boolean;
  copiedCount: number;
  lastCopiedAt: string | null;
  createdAt: string;
  master: CopyAccountLite;
  follower: CopyAccountLite;
  analytics: CopyLinkAnalytics;
};

export type CopyEventRow = {
  id: string;
  action: string; // OPEN | CLOSE
  status: string; // FILLED | SKIPPED | FAILED
  reason: string | null;
  instrument: string;
  direction: string;
  sizeUnits: number | null;
  pnl: number | null;
  createdAt: string;
  masterNickname: string;
  followerNickname: string;
};

/** One day of copied realized P&L for the hero sparkline. */
export type CopyPnlPoint = { date: string; pnl: number; cumulative: number };

export type CopyTradingStats = {
  activeLinks: number;
  totalLinks: number;
  followerAccounts: number;
  masterAccounts: number;
  totalCopied: number;
  copiedToday: number;
  realizedPnl: number;
  openCopies: number;
  winRate: number | null; // across all closed copies, null when none closed
  pnlSeries: CopyPnlPoint[]; // last 14 days, oldest first
};

export type CopyTradingData = {
  entitled: boolean;
  plan: Plan;
  accounts: CopyAccountLite[];
  links: CopyLinkRow[];
  recentEvents: CopyEventRow[];
  stats: CopyTradingStats;
  error: boolean;
};

const EMPTY_COPY_TRADING: CopyTradingData = {
  entitled: false,
  plan: "FREE",
  accounts: [],
  links: [],
  recentEvents: [],
  stats: {
    activeLinks: 0,
    totalLinks: 0,
    followerAccounts: 0,
    masterAccounts: 0,
    totalCopied: 0,
    copiedToday: 0,
    realizedPnl: 0,
    openCopies: 0,
    winRate: null,
    pnlSeries: [],
  },
  error: false,
};

type DbCopyAccount = {
  id: string;
  nickname: string;
  broker: string;
  mode: string;
  balance: unknown;
  currency: string;
  bot: { id: string } | null;
};

function serializeCopyAccount(a: DbCopyAccount): CopyAccountLite {
  return {
    id: a.id,
    nickname: a.nickname,
    broker: a.broker,
    mode: a.mode,
    balance: num(a.balance),
    currency: a.currency,
    hasBot: Boolean(a.bot),
  };
}

/**
 * Everything the Copy Trading view needs: the user's plan + entitlement (the
 * page hard-blocks the surface for plans without copy trading), their accounts,
 * the master->follower links, recent replication events, and headline stats.
 * Defensive like the rest of this module: any failure yields composed empty
 * states rather than a crash or fabricated numbers.
 */
export async function getCopyTradingData(): Promise<CopyTradingData> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_COPY_TRADING;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, nickname: true, broker: true, mode: true,
            balance: true, currency: true, bot: { select: { id: true } },
          },
        },
        copyLinks: {
          orderBy: { createdAt: "desc" },
          include: {
            masterAccount: {
              select: {
                id: true, nickname: true, broker: true, mode: true,
                balance: true, currency: true, bot: { select: { id: true } },
              },
            },
            followerAccount: {
              select: {
                id: true, nickname: true, broker: true, mode: true,
                balance: true, currency: true, bot: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!user) return EMPTY_COPY_TRADING;

    const plan = (user.plan as Plan) || "FREE";
    const entitled = Boolean(PLANS[plan]?.copyTrading);
    const accounts = user.accounts.map(serializeCopyAccount);

    const rawLinks = user.copyLinks;
    const linkIds = rawLinks.map((l) => l.id);

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const seriesStart = new Date(startOfToday);
    seriesStart.setUTCDate(seriesStart.getUTCDate() - 13); // 14-day window, inclusive

    // One batched pass for everything events-backed: the recent feed, per-link
    // analytics, the headline aggregates, and the 14-day P&L series. Empty link
    // sets short-circuit the per-link queries so the page stays cheap.
    const [eventRows, copiedToday, realizedAgg, closeGroups, winGroups, todayGroups, openEventRows, seriesRows] =
      await Promise.all([
        prisma.copyTradeEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 40 }),
        prisma.copyTradeEvent.count({
          where: { userId: user.id, action: "OPEN", status: "FILLED", createdAt: { gte: startOfToday } },
        }),
        prisma.copyTradeEvent.aggregate({
          where: { userId: user.id, action: "CLOSE", status: "FILLED" },
          _sum: { pnl: true },
        }),
        linkIds.length
          ? prisma.copyTradeEvent.groupBy({
              by: ["copyLinkId"],
              where: { copyLinkId: { in: linkIds }, action: "CLOSE", status: "FILLED" },
              _sum: { pnl: true },
              _count: { _all: true },
            })
          : Promise.resolve([] as { copyLinkId: string | null; _sum: { pnl: unknown }; _count: { _all: number } }[]),
        linkIds.length
          ? prisma.copyTradeEvent.groupBy({
              by: ["copyLinkId"],
              where: { copyLinkId: { in: linkIds }, action: "CLOSE", status: "FILLED", pnl: { gt: 0 } },
              _count: { _all: true },
            })
          : Promise.resolve([] as { copyLinkId: string | null; _count: { _all: number } }[]),
        linkIds.length
          ? prisma.copyTradeEvent.groupBy({
              by: ["copyLinkId"],
              where: { copyLinkId: { in: linkIds }, action: "CLOSE", status: "FILLED", createdAt: { gte: startOfToday } },
              _sum: { pnl: true },
            })
          : Promise.resolve([] as { copyLinkId: string | null; _sum: { pnl: unknown } }[]),
        linkIds.length
          ? prisma.copyTradeEvent.findMany({
              where: { copyLinkId: { in: linkIds }, action: "OPEN", status: "FILLED", followerTradeId: { not: null } },
              select: { copyLinkId: true, followerTradeId: true },
            })
          : Promise.resolve([] as { copyLinkId: string | null; followerTradeId: string | null }[]),
        prisma.copyTradeEvent.findMany({
          where: { userId: user.id, action: "CLOSE", status: "FILLED", createdAt: { gte: seriesStart } },
          select: { createdAt: true, pnl: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

    // Which copied trades are still open (for the per-link "open copies" count).
    const followerTradeIds = openEventRows.map((e) => e.followerTradeId).filter((id): id is string => Boolean(id));
    const openTradeIds = followerTradeIds.length
      ? new Set(
          (
            await prisma.trade.findMany({
              where: { id: { in: followerTradeIds }, status: "OPEN" },
              select: { id: true },
            })
          ).map((t) => t.id),
        )
      : new Set<string>();
    const openCopiesByLink = new Map<string, number>();
    for (const e of openEventRows) {
      if (e.copyLinkId && e.followerTradeId && openTradeIds.has(e.followerTradeId)) {
        openCopiesByLink.set(e.copyLinkId, (openCopiesByLink.get(e.copyLinkId) ?? 0) + 1);
      }
    }

    const closeByLink = new Map(closeGroups.map((g) => [g.copyLinkId as string, g]));
    const winsByLink = new Map(winGroups.map((g) => [g.copyLinkId as string, g._count._all]));
    const todayByLink = new Map(todayGroups.map((g) => [g.copyLinkId as string, g._sum.pnl === null ? 0 : num(g._sum.pnl)]));

    const links: CopyLinkRow[] = rawLinks.map((l) => {
      const close = closeByLink.get(l.id);
      const closed = close?._count._all ?? 0;
      const wins = winsByLink.get(l.id) ?? 0;
      return {
        id: l.id,
        status: l.status as CopyLinkStatus,
        sizingMode: l.sizingMode as CopySizingMode,
        multiplier: num(l.multiplier),
        fixedUnits: l.fixedUnits === null ? null : num(l.fixedUnits),
        maxRiskPct: l.maxRiskPct === null ? null : num(l.maxRiskPct),
        minUnits: l.minUnits === null ? null : num(l.minUnits),
        maxUnits: l.maxUnits === null ? null : num(l.maxUnits),
        symbolFilter: l.symbolFilter,
        symbolFilterMode: (l.symbolFilterMode as CopyFilterMode) ?? "ALLOW",
        maxDailyLossPct: l.maxDailyLossPct === null ? null : num(l.maxDailyLossPct),
        pausedReason: l.pausedReason,
        reverse: l.reverse,
        copyOpen: l.copyOpen,
        copyClose: l.copyClose,
        copiedCount: l.copiedCount,
        lastCopiedAt: l.lastCopiedAt ? l.lastCopiedAt.toISOString() : null,
        createdAt: l.createdAt.toISOString(),
        master: serializeCopyAccount(l.masterAccount),
        follower: serializeCopyAccount(l.followerAccount),
        analytics: {
          closed,
          wins,
          winRate: closed > 0 ? wins / closed : null,
          realizedPnl: close && close._sum.pnl !== null ? num(close._sum.pnl) : 0,
          todayPnl: todayByLink.get(l.id) ?? 0,
          openCopies: openCopiesByLink.get(l.id) ?? 0,
        },
      };
    });

    // Recent replication events for the activity log, mapped back to the human
    // account names via the links we already loaded (no extra nested include).
    const linkMeta = new Map(links.map((l) => [l.id, { master: l.master.nickname, follower: l.follower.nickname }]));

    const recentEvents: CopyEventRow[] = eventRows.map((e) => {
      const meta = e.copyLinkId ? linkMeta.get(e.copyLinkId) : undefined;
      return {
        id: e.id,
        action: e.action,
        status: e.status,
        reason: e.reason,
        instrument: e.instrument,
        direction: e.direction,
        sizeUnits: e.sizeUnits === null ? null : num(e.sizeUnits),
        pnl: e.pnl === null ? null : num(e.pnl),
        createdAt: e.createdAt.toISOString(),
        masterNickname: meta?.master ?? "Master",
        followerNickname: meta?.follower ?? "Follower",
      };
    });

    // Bucket realized P&L into the 14-day window for the hero sparkline.
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const buckets = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(seriesStart);
      d.setUTCDate(d.getUTCDate() + i);
      buckets.set(dayKey(d), 0);
    }
    for (const r of seriesRows) {
      const key = dayKey(r.createdAt);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + (r.pnl === null ? 0 : num(r.pnl)));
    }
    let running = 0;
    const pnlSeries: CopyPnlPoint[] = [...buckets.entries()].map(([date, pnl]) => {
      running += pnl;
      return { date, pnl, cumulative: running };
    });

    const closedTotal = links.reduce((s, l) => s + l.analytics.closed, 0);
    const winsTotal = links.reduce((s, l) => s + l.analytics.wins, 0);

    const stats: CopyTradingStats = {
      activeLinks: links.filter((l) => l.status === "ACTIVE").length,
      totalLinks: links.length,
      followerAccounts: new Set(links.map((l) => l.follower.id)).size,
      masterAccounts: new Set(links.map((l) => l.master.id)).size,
      totalCopied: links.reduce((s, l) => s + l.copiedCount, 0),
      copiedToday,
      realizedPnl: realizedAgg._sum.pnl === null ? 0 : num(realizedAgg._sum.pnl),
      openCopies: links.reduce((s, l) => s + l.analytics.openCopies, 0),
      winRate: closedTotal > 0 ? winsTotal / closedTotal : null,
      pnlSeries,
    };

    return { entitled, plan, accounts, links, recentEvents, stats, error: false };
  } catch (err) {
    console.error("Error in getCopyTradingData:", err);
    return { ...EMPTY_COPY_TRADING, error: true };
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

// ─────────────────────── Accounts overview ──────────────────────

export type AccountOverviewRow = {
  id: string;
  nickname: string;
  broker: string;
  mode: "PAPER" | "LIVE";
  balance: number;
  currency: string;
  createdAt: string;
  isPropFirmMode: boolean;
  propFirmMaxTrailingDrawdown: number | null;
  maxDailyDrawdown: number | null;
  bot: { status: "RUNNING" | "WAITING" | "STOPPED"; lastHeartbeat: string | null } | null;
  /** Live-broker connection state (null for paper accounts). */
  connectionStatus: string | null;
  /** Today's realized P&L from the daily summary, null when there's no summary yet. */
  todayPnl: number | null;
  /** All-time realized P&L (sum of every daily summary). */
  totalPnl: number;
  /** All-time return on initial capital, null when it can't be derived. */
  returnPct: number | null;
  /** Win rate over closed trades, null when none have closed. */
  winRate: number | null;
  /** Closed-trade count (the win-rate denominator base). */
  tradeCount: number;
  /** Currently open positions on this account. */
  openPositions: number;
  /** Recent equity points (endBalance), oldest-first, for the sparkline. */
  spark: number[];
  /** Most recent signal of life: bot heartbeat or last summary date. */
  lastActiveAt: string | null;
};

export type AccountsOverview = {
  accounts: AccountOverviewRow[];
  plan: Plan;
  accountLimit: number;
  totals: {
    balance: number;
    todayPnl: number;
    totalPnl: number;
    accountCount: number;
    runningBots: number;
    liveCount: number;
    paperCount: number;
    openPositions: number;
  };
  error: boolean;
};

const EMPTY_ACCOUNTS_OVERVIEW: AccountsOverview = {
  accounts: [],
  plan: "FREE",
  accountLimit: PLANS.FREE.accountLimit,
  totals: {
    balance: 0,
    todayPnl: 0,
    totalPnl: 0,
    accountCount: 0,
    runningBots: 0,
    liveCount: 0,
    paperCount: 0,
    openPositions: 0,
  },
  error: false,
};

/**
 * Everything the Accounts page needs in one shot: each account's live balance,
 * today's and all-time realized P&L, win rate, open positions, an equity
 * sparkline, plus bot/connection status and the prop-firm guardrail settings.
 * Aggregates (all-time P&L, win/loss counts) come from grouped queries so they
 * stay accurate regardless of how much history an account has, while the recent
 * summaries power the sparkline and today's number. Defensive by design: any
 * failure yields a composed empty/error state, never fabricated numbers.
 */
export async function getAccountsOverview(): Promise<AccountsOverview> {
  try {
    const { userId } = await auth();
    if (!userId) return EMPTY_ACCOUNTS_OVERVIEW;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: {
          orderBy: { createdAt: "asc" },
          include: {
            bot: { select: { status: true, lastHeartbeat: true } },
            connection: { select: { status: true } },
            summaries: { orderBy: { date: "desc" }, take: 30 },
          },
        },
      },
    });

    if (!user) return EMPTY_ACCOUNTS_OVERVIEW;

    const plan = (user.plan as Plan) || "FREE";
    const accountIds = user.accounts.map((a) => a.id);

    // All-time aggregates and live open-position counts in two grouped queries,
    // so the per-account numbers don't drift with the 30-row summary window.
    const [totalsByAccount, openByAccount] = accountIds.length
      ? await Promise.all([
          prisma.dailySummary.groupBy({
            by: ["accountId"],
            where: { accountId: { in: accountIds } },
            _sum: { netPnl: true, winCount: true, lossCount: true, tradeCount: true },
          }),
          prisma.trade.groupBy({
            by: ["accountId"],
            where: { accountId: { in: accountIds }, status: "OPEN" },
            _count: { _all: true },
          }),
        ])
      : [[], []];

    const totalsMap = new Map(totalsByAccount.map((t) => [t.accountId, t]));
    const openMap = new Map(openByAccount.map((o) => [o.accountId, o._count._all]));
    const todayKey = new Date().toISOString().slice(0, 10);

    const accounts: AccountOverviewRow[] = user.accounts.map((a) => {
      const agg = totalsMap.get(a.id);
      const totalPnl = agg?._sum.netPnl != null ? num(agg._sum.netPnl) : 0;
      const wins = agg?._sum.winCount ?? 0;
      const losses = agg?._sum.lossCount ?? 0;
      const tradeCount = agg?._sum.tradeCount ?? 0;
      const decided = wins + losses;

      // summaries arrive newest-first; reverse for a chronological sparkline.
      const chrono = [...a.summaries].reverse();
      const today = a.summaries.find((s) => s.date.toISOString().slice(0, 10) === todayKey);
      const balance = num(a.balance);
      const initialCapital = balance - totalPnl;

      const lastSummaryAt = a.summaries[0]?.date.toISOString() ?? null;
      const heartbeatAt = a.bot?.lastHeartbeat?.toISOString() ?? null;
      const lastActiveAt =
        heartbeatAt && lastSummaryAt
          ? heartbeatAt > lastSummaryAt
            ? heartbeatAt
            : lastSummaryAt
          : heartbeatAt ?? lastSummaryAt;

      return {
        id: a.id,
        nickname: a.nickname,
        broker: a.broker,
        mode: a.mode as "PAPER" | "LIVE",
        balance,
        currency: a.currency,
        createdAt: a.createdAt.toISOString(),
        isPropFirmMode: a.isPropFirmMode,
        propFirmMaxTrailingDrawdown:
          a.propFirmMaxTrailingDrawdown != null ? num(a.propFirmMaxTrailingDrawdown) : null,
        maxDailyDrawdown: a.maxDailyDrawdown != null ? num(a.maxDailyDrawdown) : null,
        bot: a.bot
          ? {
              status: a.bot.status as "RUNNING" | "WAITING" | "STOPPED",
              lastHeartbeat: heartbeatAt,
            }
          : null,
        connectionStatus: a.connection?.status ?? null,
        todayPnl: today ? num(today.netPnl) : null,
        totalPnl,
        returnPct: initialCapital > 0 ? (totalPnl / initialCapital) * 100 : null,
        winRate: decided > 0 ? (wins / decided) * 100 : null,
        tradeCount,
        openPositions: openMap.get(a.id) ?? 0,
        spark: chrono.map((s) => num(s.endBalance)),
        lastActiveAt,
      };
    });

    const totals = accounts.reduce(
      (acc, a) => {
        acc.balance += a.balance;
        acc.todayPnl += a.todayPnl ?? 0;
        acc.totalPnl += a.totalPnl;
        acc.openPositions += a.openPositions;
        if (a.mode === "LIVE") acc.liveCount += 1;
        else acc.paperCount += 1;
        if (a.bot?.status === "RUNNING") acc.runningBots += 1;
        return acc;
      },
      {
        balance: 0,
        todayPnl: 0,
        totalPnl: 0,
        accountCount: accounts.length,
        runningBots: 0,
        liveCount: 0,
        paperCount: 0,
        openPositions: 0,
      },
    );

    return { accounts, plan, accountLimit: PLANS[plan].accountLimit, totals, error: false };
  } catch (err) {
    console.error("Error in getAccountsOverview:", err);
    return { ...EMPTY_ACCOUNTS_OVERVIEW, error: true };
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
