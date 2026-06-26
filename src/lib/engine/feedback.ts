import { prisma } from "@/lib/db";
import type { AgentEventKind } from "@prisma/client";

// Human-readable explanations for why the risk engine blocked a trade. Surfaced
// in the live feed so a user understands the bot is alive and *deciding*, not
// silently broken.
export const RISK_REASON_TEXT: Record<string, string> = {
  LIVE_TRADING_NOT_ALLOWED_ON_PLAN:
    "Live trading isn't available on your current plan. Upgrade, or switch this account to Paper to keep trading.",
  CIRCUIT_BREAKER_TRIPPED:
    "Daily loss limit reached. Trading is paused for the rest of the session to protect the account.",
  GLOBAL_HARD_STOP_BALANCE_TOO_LOW:
    "Account balance is too low to size a trade safely. Bot stopped.",
  MAX_TRADES_REACHED:
    "Daily trade limit for this strategy has been reached. No more entries until tomorrow.",
  ACCOUNT_NOT_FOUND: "Account could not be found.",
};

/**
 * Write a *status* agent event, de-duplicated so the live feed isn't spammed.
 *
 * The engine ticks frequently (every minute on the serverless cron, every 2s in
 * the worker). Many ticks reach the same conclusion — "market closed", "no setup
 * yet" — so we only persist a status message when it differs from the bot's most
 * recent event, or when the previous identical message is older than `throttleMs`.
 *
 * Keep `message` static (no live prices/timestamps) for throttled statuses, or
 * the de-dupe can never match and the feed fills up.
 *
 * Returns the created event, or null when it was throttled.
 */
export async function recordBotStatus(opts: {
  botId: string;
  accountId: string;
  kind: AgentEventKind;
  message: string;
  throttleMs?: number;
}) {
  const throttleMs = opts.throttleMs ?? 10 * 60 * 1000; // 10 minutes
  const last = await prisma.agentEvent.findFirst({
    where: { botId: opts.botId },
    orderBy: { ts: "desc" },
    select: { message: true, ts: true },
  });

  if (last && last.message === opts.message && Date.now() - last.ts.getTime() < throttleMs) {
    return null;
  }

  return prisma.agentEvent.create({
    data: {
      botId: opts.botId,
      accountId: opts.accountId,
      kind: opts.kind,
      message: opts.message,
    },
  });
}
