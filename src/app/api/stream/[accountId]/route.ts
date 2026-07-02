import { prisma } from "@/lib/db";
import { getOwnedAccountId, getOwnedAccountIds, ALL_ACCOUNTS_ID } from "@/lib/user";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-Sent Events stream for live dashboard + trades. Polls the database on a
// short interval and pushes only what changed (new agent events, open position,
// recent closed trades, engine heartbeat, balance). The connection caps its own
// lifetime so serverless platforms don't kill it mid-flight; the browser's
// EventSource reconnects automatically and resumes from Last-Event-ID.
const POLL_MS = 1500;
const MAX_LIFETIME_MS = 50_000;

function engineStatusFrom(status: string | null, lastHeartbeat: Date | null): "ONLINE" | "DEGRADED" | "OFFLINE" {
  if (status !== "RUNNING") return "OFFLINE";
  if (!lastHeartbeat) return "OFFLINE";
  const age = Date.now() - lastHeartbeat.getTime();
  if (age < 60_000) return "ONLINE";
  if (age < 300_000) return "DEGRADED";
  return "OFFLINE";
}

export async function GET(req: Request, { params }: { params: Promise<{ accountId: string }> }) {
  const ip = clientIp(req);
  const rateLimitSuccess = await checkRateLimit(`stream_${ip}`, 30, "1 m");
  if (!rateLimitSuccess) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const p = await params;
  const parsedParams = z.object({
    accountId: z.string().max(100).regex(/^[a-zA-Z0-9_-]+$/),
  }).safeParse(p);

  if (!parsedParams.success) {
    return new Response("Invalid account ID format", { status: 400 });
  }

  const { accountId: requested } = parsedParams.data;
  const accountId = await getOwnedAccountId(requested);
  if (!accountId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const isAll = accountId === ALL_ACCOUNTS_ID;
  const accountIds = isAll ? await getOwnedAccountIds() : [accountId];
  const nameById = isAll
    ? new Map(
        (
          await prisma.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, nickname: true } })
        ).map((a) => [a.id, a.nickname]),
      )
    : new Map<string, string>();

  const lastEventId = req.headers.get("last-event-id");
  let sinceTs = lastEventId ? new Date(Number(lastEventId)) : new Date(Date.now() - 1000);
  let lastOpenTradeId: string | null = null;
  let lastClosedSig = "";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown, id?: number) => {
        let frame = `event: ${event}\n`;
        if (id) frame += `id: ${id}\n`;
        frame += `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(frame));
      };

      send("ready", { accountId });

      const started = Date.now();
      let closed = false;

      // Combined view across every account: no single open-position banner
      // (ambiguous across accounts), balance/status/events are portfolio sums.
      const tickAll = async () => {
        if (closed) return;
        try {
          const [accounts, newEvents, recentClosed] = await Promise.all([
            prisma.account.findMany({
              where: { id: { in: accountIds } },
              select: { balance: true, bot: { select: { status: true, lastHeartbeat: true } } },
            }),
            prisma.agentEvent.findMany({
              where: { accountId: { in: accountIds }, ts: { gt: sinceTs } },
              orderBy: { ts: "asc" },
              take: 30,
            }),
            prisma.trade.findMany({
              where: { accountId: { in: accountIds }, status: "CLOSED" },
              orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }],
              take: 15,
            }),
          ]);

          const bots = accounts.map((a) => a.bot).filter((b): b is NonNullable<typeof b> => Boolean(b));
          const runningBot = bots.some((b) => b.status === "RUNNING");
          const waitingBot = bots.some((b) => b.status === "WAITING");
          const latestHeartbeat = bots.reduce<Date | null>((latest, b) => {
            if (!b.lastHeartbeat) return latest;
            return !latest || b.lastHeartbeat > latest ? b.lastHeartbeat : latest;
          }, null);
          const rank = { ONLINE: 2, DEGRADED: 1, OFFLINE: 0 } as const;
          const bestEngineStatus = bots.reduce<"ONLINE" | "DEGRADED" | "OFFLINE">((best, b) => {
            const s = engineStatusFrom(b.status, b.lastHeartbeat);
            return rank[s] > rank[best] ? s : best;
          }, "OFFLINE");

          send("heartbeat", {
            balance: accounts.reduce((s, a) => s + Number(a.balance), 0),
            botStatus: bots.length === 0 ? "NONE" : runningBot ? "RUNNING" : waitingBot ? "WAITING" : "STOPPED",
            engineStatus: bestEngineStatus,
            lastHeartbeat: latestHeartbeat ? latestHeartbeat.toISOString() : null,
            ts: Date.now(),
          });

          if (newEvents.length > 0) {
            sinceTs = newEvents[newEvents.length - 1].ts;
            send(
              "agent",
              newEvents.map((e) => ({
                id: e.id,
                t: e.ts.toISOString().slice(11, 19),
                kind: e.kind,
                message: e.message,
                accountNickname: nameById.get(e.accountId),
              })),
              sinceTs.getTime(),
            );
          }

          const sig = recentClosed.map((t) => t.id).join(",");
          if (sig !== lastClosedSig) {
            lastClosedSig = sig;
            send("trades", recentClosed.map((t) => ({
              id: t.id,
              instrument: t.instrument,
              direction: t.direction,
              status: t.status,
              entryPrice: Number(t.entryPrice),
              exitPrice: t.exitPrice != null ? Number(t.exitPrice) : null,
              sizeUnits: Number(t.sizeUnits),
              netPnl: t.netPnl != null ? Number(t.netPnl) : null,
              rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
              openedAt: t.openedAt.toISOString(),
              closedAt: t.closedAt ? t.closedAt.toISOString() : null,
              accountId: t.accountId,
              accountNickname: nameById.get(t.accountId),
            })));
          }
        } catch (err) {
          console.error("SSE tick error (all accounts)", err);
        }

        if (Date.now() - started > MAX_LIFETIME_MS) {
          send("bye", { reason: "lifetime" });
          cleanup();
          return;
        }
      };

      const tickOne = async () => {
        if (closed) return;
        try {
          const [account, newEvents, openTrade, recentClosed] = await Promise.all([
            prisma.account.findUnique({
              where: { id: accountId },
              select: { balance: true, bot: { select: { status: true, lastHeartbeat: true } } },
            }),
            prisma.agentEvent.findMany({
              where: { accountId, ts: { gt: sinceTs } },
              orderBy: { ts: "asc" },
              take: 30,
            }),
            prisma.trade.findFirst({
              where: { accountId, status: "OPEN" },
              orderBy: { openedAt: "desc" },
            }),
            prisma.trade.findMany({
              where: { accountId, status: "CLOSED" },
              orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }],
              take: 15,
            }),
          ]);

          if (account) {
            send("heartbeat", {
              balance: Number(account.balance),
              botStatus: account.bot?.status ?? "NONE",
              engineStatus: engineStatusFrom(account.bot?.status ?? null, account.bot?.lastHeartbeat ?? null),
              lastHeartbeat: account.bot?.lastHeartbeat?.toISOString() ?? null,
              ts: Date.now(),
            });
          }

          if (newEvents.length > 0) {
            sinceTs = newEvents[newEvents.length - 1].ts;
            send(
              "agent",
              newEvents.map((e) => ({
                id: e.id,
                t: e.ts.toISOString().slice(11, 19),
                kind: e.kind,
                message: e.message,
              })),
              sinceTs.getTime(),
            );
          }

          const openId = openTrade?.id ?? null;
          // Always refresh the position (price targets are static, but state flips
          // open/closed); send when identity changes or every few ticks for UI.
          if (openId !== lastOpenTradeId) {
            lastOpenTradeId = openId;
            send("position", openTrade
              ? {
                  id: openTrade.id,
                  instrument: openTrade.instrument,
                  direction: openTrade.direction,
                  entryPrice: Number(openTrade.entryPrice),
                  stopPrice: Number(openTrade.stopPrice),
                  targetPrice: Number(openTrade.targetPrice),
                  sizeUnits: Number(openTrade.sizeUnits),
                  openedAt: openTrade.openedAt.toISOString(),
                }
              : null);
          }

          const sig = recentClosed.map((t) => t.id).join(",");
          if (sig !== lastClosedSig) {
            lastClosedSig = sig;
            send("trades", recentClosed.map((t) => ({
              id: t.id,
              instrument: t.instrument,
              direction: t.direction,
              status: t.status,
              entryPrice: Number(t.entryPrice),
              exitPrice: t.exitPrice != null ? Number(t.exitPrice) : null,
              sizeUnits: Number(t.sizeUnits),
              netPnl: t.netPnl != null ? Number(t.netPnl) : null,
              rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
              openedAt: t.openedAt.toISOString(),
              closedAt: t.closedAt ? t.closedAt.toISOString() : null,
            })));
          }
        } catch (err) {
          console.error("SSE tick error", err);
        }

        if (Date.now() - started > MAX_LIFETIME_MS) {
          send("bye", { reason: "lifetime" });
          cleanup();
          return;
        }
      };

      const tick = isAll ? tickAll : tickOne;
      const interval = setInterval(tick, POLL_MS);
      void tick();

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
