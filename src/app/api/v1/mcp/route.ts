import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseStrategyParams, coerceStrategyParams, applyRawParam } from "@/lib/strategy-schema";

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

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
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
      data: { params: result.params as any },
    });

    return NextResponse.json({ success: true, newParams: result.params });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
