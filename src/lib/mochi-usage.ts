import { prisma } from "@/lib/db";
import { MOCHI_LIMITS, type Plan } from "@/lib/plans";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type MochiUsageSummary = {
  used5h: number;
  usedWeek: number;
  limit5h: number;
  limitWeek: number;
  remaining5h: number;
  remainingWeek: number;
  lastMessageTokens: number;
  blocked: boolean;
  window: "5h" | "week" | null; // which window is exhausted, if any
};

function sumWindow(rows: { ts: Date; totalTokens: number }[], sinceMs: number, now: number): number {
  let total = 0;
  for (const r of rows) {
    if (now - r.ts.getTime() <= sinceMs) total += r.totalTokens;
  }
  return total;
}

/**
 * Summarise a user's Mochi token spend over the rolling windows and compare it
 * to their plan limits. Defensive: if the usage table doesn't exist yet (the
 * migration hasn't been applied) it returns an unblocked, zeroed summary so
 * Mochi keeps working rather than hard-failing.
 */
export async function getMochiUsage(userId: string, plan: Plan): Promise<MochiUsageSummary> {
  const limits = MOCHI_LIMITS[plan] ?? MOCHI_LIMITS.FREE;
  const base: MochiUsageSummary = {
    used5h: 0,
    usedWeek: 0,
    limit5h: limits.per5h,
    limitWeek: limits.perWeek,
    remaining5h: limits.per5h,
    remainingWeek: limits.perWeek,
    lastMessageTokens: 0,
    blocked: false,
    window: null,
  };

  try {
    const now = Date.now();
    const since = new Date(now - WEEK_MS);
    const rows = await prisma.mochiUsage.findMany({
      where: { userId, ts: { gte: since } },
      select: { ts: true, totalTokens: true },
      orderBy: { ts: "asc" },
    });
    const used5h = sumWindow(rows, FIVE_HOURS_MS, now);
    const usedWeek = sumWindow(rows, WEEK_MS, now);
    const window = usedWeek >= limits.perWeek ? "week" : used5h >= limits.per5h ? "5h" : null;
    return {
      used5h,
      usedWeek,
      limit5h: limits.per5h,
      limitWeek: limits.perWeek,
      remaining5h: Math.max(0, limits.per5h - used5h),
      remainingWeek: Math.max(0, limits.perWeek - usedWeek),
      lastMessageTokens: rows.length > 0 ? rows[rows.length - 1].totalTokens : 0,
      blocked: window !== null,
      window,
    };
  } catch (err) {
    console.error("[mochi-usage] read failed (table missing?)", err);
    return base;
  }
}

/** Record one request's token usage. No-ops gracefully if the table is absent. */
export async function recordMochiUsage(
  userId: string,
  usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number },
): Promise<void> {
  const promptTokens = Math.max(0, Math.round(usage.promptTokens ?? 0));
  const completionTokens = Math.max(0, Math.round(usage.completionTokens ?? 0));
  const totalTokens = Math.max(0, Math.round(usage.totalTokens ?? promptTokens + completionTokens));
  if (totalTokens === 0) return;
  try {
    await prisma.mochiUsage.create({
      data: { userId, promptTokens, completionTokens, totalTokens },
    });
  } catch (err) {
    console.error("[mochi-usage] write failed (table missing?)", err);
  }
}
