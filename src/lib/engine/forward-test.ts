// Forward-test orchestration. Computes each test's observed paper performance
// from real closed trades, runs the pure evaluator, persists status transitions,
// and serializes rows for the UI. The promote gate calls verifyForwardTestPassed
// so a strategy can only be promoted to live after the edge actually held.

import { prisma } from "@/lib/db";
import { evaluateForwardTest, type ForwardEvaluation } from "./forward-test-eval";

export type ForwardTestRow = {
  id: string;
  strategyId: string;
  strategyName: string;
  accountId: string;
  accountNickname: string;
  status: "RUNNING" | "PASSED" | "FAILED" | "STOPPED";
  targetTrades: number;
  baselineExpectancy: number | null;
  observedTrades: number;
  observedWinRate: number;
  observedExpectancyR: number;
  progress: number;
  reason: string;
  startedAt: string;
};

type FtRecord = {
  id: string;
  status: "RUNNING" | "PASSED" | "FAILED" | "STOPPED";
  targetTrades: number;
  baselineWinRate: unknown;
  baselineExpectancy: unknown;
  startedAt: Date;
  strategyId: string;
  accountId: string;
  strategy: { name: string };
  account: { nickname: string };
};

const num = (v: unknown): number | null => (v == null ? null : Number(v));

/** Observed paper performance for a forward test, from its account's closed trades. */
async function observe(accountId: string, startedAt: Date): Promise<{ trades: number; winRate: number; expectancyR: number }> {
  const rows = await prisma.trade.findMany({
    where: { accountId, status: "CLOSED", openedAt: { gte: startedAt }, rMultiple: { not: null } },
    select: { rMultiple: true, netPnl: true },
  });
  const rs = rows.map((r) => Number(r.rMultiple));
  const trades = rs.length;
  if (trades === 0) return { trades: 0, winRate: 0, expectancyR: 0 };
  const wins = rows.filter((r) => Number(r.netPnl ?? 0) > 0).length;
  const expectancyR = rs.reduce((a, b) => a + b, 0) / trades;
  return { trades, winRate: (wins / trades) * 100, expectancyR };
}

function toRow(ft: FtRecord, observed: { trades: number; winRate: number; expectancyR: number }, evaln: ForwardEvaluation): ForwardTestRow {
  return {
    id: ft.id,
    strategyId: ft.strategyId,
    strategyName: ft.strategy.name,
    accountId: ft.accountId,
    accountNickname: ft.account.nickname,
    status: ft.status === "STOPPED" ? "STOPPED" : evaln.status,
    targetTrades: ft.targetTrades,
    baselineExpectancy: num(ft.baselineExpectancy),
    observedTrades: observed.trades,
    observedWinRate: Math.round(observed.winRate * 10) / 10,
    observedExpectancyR: Math.round(observed.expectancyR * 100) / 100,
    progress: evaln.progress,
    reason: ft.status === "STOPPED" ? "Forward test stopped." : evaln.reason,
    startedAt: ft.startedAt.toISOString(),
  };
}

/** Evaluate one record, persisting a RUNNING -> PASSED/FAILED transition. */
async function evaluateRecord(ft: FtRecord): Promise<ForwardTestRow> {
  const observed = await observe(ft.accountId, ft.startedAt);
  const evaln = evaluateForwardTest(
    observed,
    { winRate: num(ft.baselineWinRate), expectancyR: num(ft.baselineExpectancy) },
    ft.targetTrades,
  );

  // Only RUNNING tests move; PASSED/FAILED/STOPPED are terminal and stay put.
  if (ft.status === "RUNNING" && evaln.status !== "RUNNING") {
    await prisma.forwardTest.update({ where: { id: ft.id }, data: { status: evaln.status } });
    ft.status = evaln.status;
  }
  return toRow(ft, observed, evaln);
}

/** All of a user's forward tests, freshly evaluated. */
export async function getForwardTests(userId: string): Promise<ForwardTestRow[]> {
  const records = await prisma.forwardTest.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: { strategy: { select: { name: true } }, account: { select: { nickname: true } } },
  });
  return Promise.all(records.map((r) => evaluateRecord(r as unknown as FtRecord)));
}

/** Server-side re-check used by the promote gate. */
export async function verifyForwardTestPassed(id: string, userId: string): Promise<boolean> {
  const ft = await prisma.forwardTest.findFirst({
    where: { id, userId },
    include: { strategy: { select: { name: true } }, account: { select: { nickname: true } } },
  });
  if (!ft) return false;
  const row = await evaluateRecord(ft as unknown as FtRecord);
  return row.status === "PASSED";
}
