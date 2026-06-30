import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";
import { resolveCopyOrder, type CopyRule, type CopyFilterMode } from "@/lib/copy-trading";
import { executeTrade, closeTrade } from "./execution-router";
import type { CopyLink, Trade } from "@prisma/client";

/**
 * Copy-trading replication engine.
 *
 * When a master account's bot opens or closes a trade, these functions fan the
 * order out to every ACTIVE follower account linked to it, sizing each copy per
 * the link's rule. Cross-broker by design: each follower order is routed through
 * the execution router (live broker or paper sim) exactly like a first-party
 * trade, with the `replicate` flag disabled so a copy never triggers another
 * round of copying (no recursion, no chains beyond one hop).
 *
 * All sizing decisions (direction, symbol filter, size bounds, the real per-trade
 * risk cap) live in `resolveCopyOrder`, the same pure helper the editor preview
 * calls, so what a trader configures is exactly what the engine places. Each link
 * can also carry a daily-loss circuit breaker that auto-pauses it once copied
 * losses for the day cross the limit.
 *
 * Everything is best-effort and fully guarded: a copy that fails is logged as a
 * CopyTradeEvent and never propagates back to break the master's own trade.
 */

const num = (d: unknown): number => Number(d as { toString(): string });

function userHasCopyTrading(plan: string | null | undefined): boolean {
  const cfg = PLANS[(plan as Plan) ?? "FREE"];
  return Boolean(cfg?.copyTrading);
}

/** Project a CopyLink row onto the pure sizing rule the resolver understands. */
function buildRule(link: CopyLink): CopyRule {
  return {
    sizingMode: link.sizingMode,
    multiplier: num(link.multiplier),
    fixedUnits: link.fixedUnits === null ? null : num(link.fixedUnits),
    maxRiskPct: link.maxRiskPct === null ? null : num(link.maxRiskPct),
    minUnits: link.minUnits === null ? null : num(link.minUnits),
    maxUnits: link.maxUnits === null ? null : num(link.maxUnits),
    reverse: link.reverse,
    symbolFilter: link.symbolFilter,
    symbolFilterMode: (link.symbolFilterMode as CopyFilterMode) ?? "ALLOW",
  };
}

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Today's realized copied loss on a link, as a positive dollar figure (0 when
 * the link is flat or up). Used by the daily-loss circuit breaker.
 */
async function todaysCopiedLoss(copyLinkId: string): Promise<number> {
  const agg = await prisma.copyTradeEvent.aggregate({
    where: { copyLinkId, action: "CLOSE", status: "FILLED", createdAt: { gte: startOfUtcDay() } },
    _sum: { pnl: true },
  });
  const net = agg._sum.pnl === null ? 0 : num(agg._sum.pnl);
  return net < 0 ? -net : 0;
}

/** Fan a freshly opened master trade out to its followers. */
export async function replicateOpen(sourceTrade: Trade): Promise<void> {
  try {
    const links = await prisma.copyLink.findMany({
      where: { masterAccountId: sourceTrade.accountId, status: "ACTIVE", copyOpen: true },
      include: {
        masterAccount: { select: { userId: true, balance: true, user: { select: { plan: true } } } },
        followerAccount: { include: { bot: true } },
      },
    });
    if (links.length === 0) return;

    // Entitlement is per user; a downgrade silently disables replication even if
    // stale ACTIVE links remain. The DB record stays so it re-arms on re-upgrade.
    if (!userHasCopyTrading(links[0].masterAccount.user.plan)) return;

    const masterBalance = num(links[0].masterAccount.balance);
    const masterUnits = Math.abs(num(sourceTrade.sizeUnits));
    const masterRiskPct = num(sourceTrade.riskPct);

    for (const link of links) {
      const follower = link.followerAccount;
      try {
        if (!follower.bot) {
          await logEvent(link.id, link.masterAccount.userId, sourceTrade, "OPEN", "SKIPPED", sourceTrade.direction, null, {
            reason: "Follower account has no bot to receive copied trades.",
          });
          continue;
        }

        const followerBalance = num(follower.balance);

        // Daily-loss circuit breaker: trip once, pause the link, and skip. The
        // link stays in the DB (paused) so the trader can review and resume it.
        if (link.maxDailyLossPct !== null) {
          const loss = await todaysCopiedLoss(link.id);
          const limit = (num(link.maxDailyLossPct) / 100) * followerBalance;
          if (limit > 0 && loss >= limit) {
            const reason = `Daily loss limit hit: copied losses of $${loss.toFixed(2)} reached the ${num(link.maxDailyLossPct)}% cap. Link paused.`;
            await prisma.$transaction([
              prisma.copyLink.update({
                where: { id: link.id },
                data: { status: "PAUSED", pausedReason: reason },
              }),
              prisma.agentEvent.create({
                data: {
                  botId: follower.bot.id,
                  accountId: follower.id,
                  kind: "RISK",
                  message: `Copy link auto-paused. ${reason}`,
                },
              }),
            ]);
            await logEvent(link.id, link.masterAccount.userId, sourceTrade, "OPEN", "SKIPPED", sourceTrade.direction, null, { reason });
            continue;
          }
        }

        const resolved = resolveCopyOrder({
          direction: sourceTrade.direction as "LONG" | "SHORT",
          masterUnits,
          masterBalance,
          followerBalance,
          instrument: sourceTrade.instrument,
          entryPrice: num(sourceTrade.entryPrice),
          stopPrice: num(sourceTrade.stopPrice),
          targetPrice: num(sourceTrade.targetPrice),
          masterRiskPct,
          rule: buildRule(link),
        });

        if (resolved.skip) {
          await logEvent(link.id, link.masterAccount.userId, sourceTrade, "OPEN", "SKIPPED", resolved.direction, null, {
            reason: resolved.skip.reason,
          });
          continue;
        }

        const followerTrade = await executeTrade(
          follower.bot.id,
          follower.id,
          {
            direction: resolved.direction,
            entryPrice: num(sourceTrade.entryPrice),
            stopPrice: resolved.stopPrice,
            targetPrice: resolved.targetPrice,
          },
          { sizeUnits: resolved.units, riskPct: resolved.riskPct },
          sourceTrade.instrument,
          { replicate: false },
        );

        await prisma.$transaction([
          prisma.copyTradeEvent.create({
            data: {
              copyLinkId: link.id,
              sourceTradeId: sourceTrade.id,
              followerTradeId: followerTrade.id,
              action: "OPEN",
              status: "FILLED",
              instrument: sourceTrade.instrument,
              direction: resolved.direction,
              sizeUnits: resolved.units,
              userId: link.masterAccount.userId,
            },
          }),
          prisma.agentEvent.create({
            data: {
              botId: follower.bot.id,
              accountId: follower.id,
              kind: "TRADE",
              message: `Copied ${resolved.direction} on ${sourceTrade.instrument} from a linked master account. Size: ${resolved.units.toFixed(4)} (${link.sizingMode.toLowerCase()}).`,
              tradeId: followerTrade.id,
            },
          }),
          prisma.copyLink.update({
            where: { id: link.id },
            data: { copiedCount: { increment: 1 }, lastCopiedAt: new Date() },
          }),
        ]);
      } catch (err) {
        console.error(`[copy-trading] open replication failed for link ${link.id}`, err);
        await logEvent(link.id, link.masterAccount.userId, sourceTrade, "OPEN", "FAILED", sourceTrade.direction, null, {
          reason: (err as Error)?.message?.slice(0, 240) || "Copy entry failed.",
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[copy-trading] replicateOpen error", err);
  }
}

/** Close every follower trade that mirrored a now-closed master trade. */
export async function replicateClose(sourceTrade: Trade, exitPrice: number): Promise<void> {
  try {
    const opens = await prisma.copyTradeEvent.findMany({
      where: { sourceTradeId: sourceTrade.id, action: "OPEN", status: "FILLED", followerTradeId: { not: null } },
      include: { copyLink: { select: { id: true, copyClose: true, followerAccountId: true } } },
    });
    if (opens.length === 0) return;

    for (const ev of opens) {
      if (!ev.followerTradeId) continue;
      const link = ev.copyLink;
      try {
        if (link && !link.copyClose) {
          await logEvent(link.id, ev.userId, sourceTrade, "CLOSE", "SKIPPED", ev.direction, ev.followerTradeId, {
            reason: "Link is set to not mirror exits.",
          });
          continue;
        }

        const followerTrade = await prisma.trade.findUnique({ where: { id: ev.followerTradeId } });
        if (!followerTrade || followerTrade.status !== "OPEN") continue;

        const pnl = await closeTrade(followerTrade.id, link ? link.followerAccountId : followerTrade.accountId, "COPY_CLOSE", exitPrice, {
          replicate: false,
        });

        const status = pnl === null ? "FAILED" : "FILLED";
        const reason = pnl === null ? "Trade close failed or skipped." : null;

        await prisma.$transaction([
          prisma.agentEvent.create({
            data: {
              botId: followerTrade.botId,
              accountId: link ? link.followerAccountId : followerTrade.accountId,
              kind: pnl === null ? "RISK" : "TRADE",
              message: pnl === null
                ? `Failed to close copied ${followerTrade.direction} on ${sourceTrade.instrument}.`
                : `Closed copied ${followerTrade.direction} on ${sourceTrade.instrument} mirroring the master exit. PnL: $${pnl.toFixed(2)}.`,
              tradeId: followerTrade.id,
            },
          }),
          prisma.copyTradeEvent.create({
            data: {
              copyLinkId: link ? link.id : null,
              sourceTradeId: sourceTrade.id,
              followerTradeId: followerTrade.id,
              action: "CLOSE",
              status,
              reason,
              instrument: sourceTrade.instrument,
              direction: followerTrade.direction,
              sizeUnits: Math.abs(num(followerTrade.sizeUnits)),
              pnl: pnl,
              userId: ev.userId,
            },
          }),
        ]);
      } catch (err) {
        console.error(`[copy-trading] close replication failed for link ${ev.copyLinkId}`, err);
        await logEvent(ev.copyLinkId, ev.userId, sourceTrade, "CLOSE", "FAILED", ev.direction, ev.followerTradeId, {
          reason: (err as Error)?.message?.slice(0, 240) || "Copy close failed.",
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[copy-trading] replicateClose error", err);
  }
}

/** Append a single replication outcome to the audit log. */
async function logEvent(
  copyLinkId: string | null,
  userId: string,
  sourceTrade: Trade,
  action: "OPEN" | "CLOSE",
  status: "FILLED" | "SKIPPED" | "FAILED",
  direction: string,
  followerTradeId: string | null,
  extra: { reason?: string },
): Promise<void> {
  await prisma.copyTradeEvent.create({
    data: {
      copyLinkId,
      userId,
      sourceTradeId: sourceTrade.id,
      followerTradeId,
      action,
      status,
      reason: extra.reason ?? null,
      instrument: sourceTrade.instrument,
      direction,
    },
  });
}
