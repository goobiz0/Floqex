import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Stable id so re-seeding updates the same demo records rather than duplicating.
const DEMO_CLERK_ID = "demo_floqex_account";

// Mirrors src/lib/strategy-schema DEFAULT_PARAMS (inlined to keep the seed free
// of app path aliases so it runs under tsx without extra config).
const DEFAULT_PARAMS = {
  rangeMinutes: 15,
  rrTarget: 2,
  minRange: 0.3,
  maxRange: 3,
  riskPct: 1,
  dailyLoss: 3,
  maxTrades: 8,
  trendFilter: true,
  reEntry: true,
};

const INSTRUMENTS = ["GC=F", "NQ=F", "ES=F"] as const;
const RANGE_BUCKETS = ["SMALL", "MEDIUM", "LARGE"] as const;

/** Deterministic PRNG (mulberry32) so the demo curve is identical every run. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const user = await prisma.user.upsert({
    where: { clerkId: DEMO_CLERK_ID },
    update: {},
    create: {
      clerkId: DEMO_CLERK_ID,
      email: "demo@floqex.com",
      firstName: "Floqex",
      lastName: "Demo",
    },
  });

  let strategy = await prisma.strategy.findFirst({ where: { userId: user.id } });
  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        userId: user.id,
        name: "Opening Range Breakout",
        kind: "ORB",
        params: DEFAULT_PARAMS as Prisma.InputJsonValue,
      },
    });
  }

  let account = await prisma.account.findFirst({ where: { userId: user.id } });
  if (!account) {
    account = await prisma.account.create({
      data: { userId: user.id, nickname: "Floqex Demo", broker: "PAPER", mode: "PAPER", balance: 10000 },
    });
  }

  const bot = await prisma.bot.upsert({
    where: { accountId: account.id },
    update: { status: "RUNNING", lastHeartbeat: new Date() },
    create: { userId: user.id, name: "Demo Bot", accountId: account.id, strategyId: strategy.id, status: "RUNNING", lastHeartbeat: new Date() },
  });

  // Idempotent: wipe prior demo history before regenerating.
  await prisma.agentEvent.deleteMany({ where: { accountId: account.id } });
  await prisma.trade.deleteMany({ where: { accountId: account.id } });
  await prisma.dailySummary.deleteMany({ where: { accountId: account.id } });

  // Narrated decisions for the most recent session feed the live agent feed.
  // Tied to the real trades created below, so the demo feed mirrors real output.
  type Ev = { ts: Date; kind: "INFO" | "SIGNAL" | "TRADE" | "RISK"; message: string };
  const events: Ev[] = [];

  const rand = mulberry32(42);
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (dates.length < 25) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) dates.unshift(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let balance = 10000;
  const lastDate = dates[dates.length - 1];
  for (const date of dates) {
    const startBalance = balance;
    const nTrades = rand() < 0.5 ? 1 : 2;
    let dayPnl = 0;
    let wins = 0;
    let losses = 0;
    const isLast = date === lastDate;

    if (isLast) {
      const openTs = new Date(date);
      openTs.setUTCHours(13, 30, 0, 0);
      events.push({
        ts: openTs,
        kind: "INFO",
        message: "NY session open. Building the opening range on GC, NQ and ES.",
      });
    }

    for (let i = 0; i < nTrades; i++) {
      const win = rand() < 0.58;
      const instrument = INSTRUMENTS[Math.floor(rand() * INSTRUMENTS.length)];
      const session: "ASIA" | "NY" = instrument === "GC=F" && rand() < 0.5 ? "ASIA" : "NY";
      const direction: "LONG" | "SHORT" = rand() < 0.5 ? "LONG" : "SHORT";
      const risk = balance * 0.01;
      const r = win ? 2 : -1;
      const netPnl = round2(risk * r);
      const entry = round2(1900 + rand() * 400);
      const stopDist = round2(entry * 0.004);
      const stop = direction === "LONG" ? entry - stopDist : entry + stopDist;
      const target = direction === "LONG" ? entry + stopDist * 2 : entry - stopDist * 2;
      const exit = win ? target : stop;
      const openedAt = new Date(date);
      openedAt.setUTCHours(13, 35 + i * 25, 0, 0);
      const closedAt = new Date(openedAt.getTime() + 40 * 60_000);

      dayPnl += netPnl;
      balance += netPnl;
      if (win) wins++;
      else losses++;

      await prisma.trade.create({
        data: {
          botId: bot.id,
          accountId: account.id,
          instrument,
          direction,
          session,
          status: "CLOSED",
          entryPrice: entry,
          exitPrice: exit,
          stopPrice: stop,
          targetPrice: target,
          sizeUnits: round2(risk / stopDist),
          riskPct: 1,
          grossPnl: netPnl,
          commission: 0,
          netPnl,
          rMultiple: r,
          mfe: win ? 2 : round2(rand() * 1.2),
          mae: win ? round2(-(rand() * 0.6)) : -1,
          rangeBucket: RANGE_BUCKETS[Math.floor(rand() * RANGE_BUCKETS.length)],
          entryBucket: rand() < 0.5 ? "FIRST_HOUR" : "LATER",
          trendAgree: rand() < 0.6,
          narrative: win
            ? "Broke the opening range with momentum and ran to the 2R target."
            : "Breakout failed, reversed through the range, and hit the stop.",
          openedAt,
          closedAt,
        },
      });

      if (isLast) {
        const signalTs = new Date(openedAt.getTime() - 2 * 60_000);
        events.push({
          ts: signalTs,
          kind: "SIGNAL",
          message: `${instrument} closed beyond the opening range — ${direction.toLowerCase()} breakout candidate.`,
        });
        events.push({
          ts: openedAt,
          kind: "TRADE",
          message: `Entered ${direction} ${instrument} at ${entry}. Stop ${round2(stop)}, target ${round2(target)} (2R).`,
        });
        events.push({
          ts: closedAt,
          kind: win ? "TRADE" : "RISK",
          message: win
            ? `Target hit on ${instrument}. Booked ${netPnl >= 0 ? "+" : ""}${netPnl} at +2R.`
            : `Stop hit on ${instrument}. Logged ${netPnl} at -1R and stepped aside.`,
        });
      }
    }

    await prisma.dailySummary.create({
      data: {
        accountId: account.id,
        date,
        netPnl: round2(dayPnl),
        tradeCount: nTrades,
        winCount: wins,
        lossCount: losses,
        startBalance: round2(startBalance),
        endBalance: round2(balance),
      },
    });
  }

  // Close out the latest session feed.
  if (events.length) {
    const closeTs = new Date(lastDate);
    closeTs.setUTCHours(20, 0, 0, 0);
    events.push({
      ts: closeTs,
      kind: "INFO",
      message: "NY session closed. Caps respected, no open positions carried.",
    });
    events.sort((a, b) => a.ts.getTime() - b.ts.getTime());
    await prisma.agentEvent.createMany({
      data: events.map((e) => ({
        botId: bot.id,
        accountId: account.id,
        ts: e.ts,
        kind: e.kind,
        message: e.message,
      })),
    });
  }

  await prisma.account.update({ where: { id: account.id }, data: { balance: round2(balance) } });
  console.log(
    `Seeded demo account over ${dates.length} sessions and ${events.length} agent events, final balance ${round2(balance)}.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
