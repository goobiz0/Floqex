import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseStrategyParams, coerceStrategyParams, applyRawParam } from "@/lib/strategy-schema";
import type { Prisma } from "@prisma/client";

import { checkRateLimit } from "@/lib/ratelimit";

// Middleware to check mcpKey
async function getMcpUser(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.split(" ")[1];

  const match = key.match(/^fqx_mcp_(user_[a-zA-Z0-9]+)_/);
  if (!match) return null;
  const clerkId = match[1];

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  try {
    const clerkUser = await client.users.getUser(clerkId);
    if (clerkUser.privateMetadata.mcpKey !== key) return null;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      accounts: { include: { bot: { include: { strategy: true } } } },
      strategies: true,
    },
  });
  return user;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const success = await checkRateLimit(`mcp_get_${ip}`, 20, "1 m");
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const user = await getMcpUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "overview") {
    const data = await Promise.all(
      user.accounts.map(async (acc) => {
        const trades = await prisma.trade.findMany({
          where: { accountId: acc.id },
          take: 5,
          orderBy: { createdAt: "desc" },
        });
        return {
          accountId: acc.id,
          nickname: acc.nickname,
          mode: acc.mode,
          balance: Number(acc.balance),
          botStatus: acc.bot?.status || "NO_BOT",
          strategyId: acc.bot?.strategyId || null,
          recentTrades: trades.map((t) => ({
            instrument: t.instrument,
            direction: t.direction,
            netPnl: t.netPnl ? Number(t.netPnl) : null,
          })),
        };
      })
    );
    return NextResponse.json({ accounts: data });
  }

  if (action === "trades") {
    const accountId = url.searchParams.get("accountId");
    const limit = Number(url.searchParams.get("limit") || 50);
    const trades = await prisma.trade.findMany({
      where: {
        accountId: accountId ? accountId : { in: user.accounts.map(a => a.id) }
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ trades });
  }

  if (action === "performance") {
    const summaries = await prisma.dailySummary.findMany({
      where: { accountId: { in: user.accounts.map(a => a.id) } },
      orderBy: { date: "desc" },
      take: 30
    });
    
    let totalPnl = 0;
    let wins = 0;
    let totalTrades = 0;
    for (const s of summaries) {
      totalPnl += Number(s.netPnl);
      wins += s.winCount;
      totalTrades += s.tradeCount;
    }
    
    return NextResponse.json({ 
      aggregate: {
        totalPnl,
        winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
        totalTrades
      },
      summaries 
    });
  }

  if (action === "logs") {
    const events = await prisma.agentEvent.findMany({
      where: { accountId: { in: user.accounts.map(a => a.id) } },
      take: 100,
      orderBy: { ts: "desc" }
    });
    return NextResponse.json({ events });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const success = await checkRateLimit(`mcp_post_${ip}`, 20, "1 m");
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const user = await getMcpUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "adjust") {
    const body = await request.json();
    const { strategyId, paramKey, newValue } = body;

    const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
    if (!strategy || strategy.userId !== user.id) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const currentParams = coerceStrategyParams(strategy.params);
    const result = applyRawParam(currentParams, paramKey, String(newValue));

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await prisma.strategy.update({
      where: { id: strategyId },
      data: { params: result.params as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true, newParams: result.params });
  }

  if (action === "bot_toggle") {
    const body = await request.json();
    const { accountId, status } = body; // status: "RUNNING" | "STOPPED"
    
    const account = user.accounts.find(a => a.id === accountId);
    if (!account || !account.bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

    await prisma.bot.update({
      where: { id: account.bot.id },
      data: { status }
    });
    
    return NextResponse.json({ success: true, status });
  }

  if (action === "emergency_stop") {
    const botIds = user.accounts.filter(a => a.bot).map(a => a.bot!.id);
    await prisma.bot.updateMany({
      where: { id: { in: botIds } },
      data: { status: "STOPPED" }
    });
    return NextResponse.json({ success: true, message: "All bots stopped" });
  }

  if (action === "update_risk") {
    const body = await request.json();
    const { accountId, maxDailyDrawdown } = body;
    
    const account = user.accounts.find(a => a.id === accountId);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    await prisma.account.update({
      where: { id: accountId },
      data: { maxDailyDrawdown }
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
