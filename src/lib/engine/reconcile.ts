// Startup position reconciliation. When the engine boots, it compares the OPEN
// trades in our DB against the positions the broker actually reports. A fill
// that landed while the engine was down, or a manual close on the broker side,
// shows up as a mismatch and is surfaced (feed event + alert) instead of the
// engine silently managing a position that no longer matches reality. This is a
// detect-and-alert pass; it never auto-closes, to avoid acting on a transient
// broker outage.

import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getBrokerPositions, type BrokerPosition } from "./live-broker";
import { sendUrgentAlert } from "@/lib/alerting";

type ConnRow = { encrypted: string };
type AccRow = { id: string; mode: string; broker: string; userId: string; connection: ConnRow | null };
type TradeRow = { botId: string; instrument: string; direction: string; sizeUnits: number | string; account: AccRow | null };

function sameInstrument(a: string, b: string): boolean {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const na = norm(a);
  const nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Reconcile every owned, LIVE account's OPEN trades against its broker's
 * reported positions. `owns` lets each cluster shard reconcile only its bots.
 * Best-effort: a broker that can't report positions is skipped, never fatal.
 */
export async function reconcileOpenPositions(owns: (botId: string) => boolean): Promise<void> {
  try {
    const openTrades = (await prisma.trade.findMany({
      where: { status: "OPEN" },
      include: { account: { include: { connection: true } } },
    })) as unknown as TradeRow[];

    // Group owned LIVE trades by account.
    const byAccount = new Map<string, { account: AccRow; trades: TradeRow[] }>();
    for (const t of openTrades) {
      if (!owns(t.botId)) continue;
      const acc = t.account;
      if (!acc || acc.mode !== "LIVE" || !acc.connection) continue;
      const entry = byAccount.get(acc.id) ?? { account: acc, trades: [] };
      entry.trades.push(t);
      byAccount.set(acc.id, entry);
    }

    for (const { account, trades } of byAccount.values()) {
      let positions: BrokerPosition[] | null = null;
      try {
        const creds = JSON.parse(decrypt(account.connection!.encrypted)) as Record<string, string>;
        creds.mode = account.mode;
        positions = await getBrokerPositions(account.broker, creds);
      } catch (e) {
        console.warn(`[reconcile] could not fetch positions for account ${account.id}:`, e);
        continue;
      }
      
      if (positions === null) continue;

      const aggregatedTrades = new Map<string, { instrument: string; direction: string; sizeUnits: number }>();
      for (const t of trades) {
        const key = `${t.instrument}-${t.direction}`;
        const existing = aggregatedTrades.get(key);
        const size = Number(t.sizeUnits) || 0;
        if (existing) {
          existing.sizeUnits += size;
        } else {
          aggregatedTrades.set(key, { instrument: t.instrument, direction: t.direction, sizeUnits: size });
        }
      }

      const mismatches: string[] = [];
      for (const t of aggregatedTrades.values()) {
        const match = positions.find((p) => sameInstrument(p.instrument, t.instrument) && p.direction === t.direction);
        if (!match) {
          mismatches.push(`${t.direction} ${t.instrument}`);
        } else {
          if (Math.abs(match.sizeUnits - t.sizeUnits) > 0.0001) {
             mismatches.push(`${t.direction} ${t.instrument} (size mismatch: DB ${t.sizeUnits.toFixed(4)}, Broker ${match.sizeUnits.toFixed(4)})`);
          }
        }
      }

      if (mismatches.length > 0) {
        const msg = `Startup reconciliation: ${mismatches.length} open trade(s) have no matching broker position (${mismatches.join(", ")}). The position may have been closed off-platform. Review before relying on the bot to manage it.`;
        console.warn(`[reconcile] account ${account.id}: ${msg}`);
        try {
          await prisma.agentEvent.create({
            data: { botId: trades[0].botId, accountId: account.id, kind: "RISK", message: msg },
          });
          await sendUrgentAlert(account.userId, "RISK", "Position mismatch on startup", msg, { accountId: account.id });
        } catch {
          // non-fatal: surfacing the warning is best-effort
        }
      }
    }
  } catch (e) {
    console.error("[reconcile] startup reconciliation failed:", e);
  }
}
