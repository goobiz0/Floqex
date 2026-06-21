import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const p = await params;
    const { accountId } = p;
    
    // Webhook secret validation can be added via URL params ?secret=XYZ or body validation
    const payload = await req.json();

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true, bot: { include: { strategy: true } } },
    });

    if (!account || !account.bot) {
      return new NextResponse("Account or Bot not found", { status: 404 });
    }

    const planConfig = PLANS[account.user.plan as Plan] || PLANS.FREE;

    // TradingView webhooks are a Pro feature
    if (account.user.plan !== "PRO") {
      return new NextResponse("TradingView Webhooks require the PRO plan", { status: 403 });
    }

    if (account.bot.status !== "RUNNING") {
      return new NextResponse("Bot is not running", { status: 400 });
    }

    // In a real app, payload would contain { action: 'buy' | 'sell', price: number, size: number }
    // We execute the trade using the account's broker API...
    const isLong = payload.action === "buy" || payload.action === "long";

    await prisma.trade.create({
      data: {
        botId: account.bot.id,
        accountId: account.id,
        instrument: payload.ticker || "CUSTOM",
        direction: isLong ? "LONG" : "SHORT",
        session: "NY",
        status: "OPEN",
        entryPrice: payload.price || 100,
        stopPrice: payload.stop || 90,
        targetPrice: payload.target || 120,
        sizeUnits: payload.size || 1,
        riskPct: 1.0,
      }
    });

    return NextResponse.json({ ok: true, message: "Webhook executed" });
  } catch (error) {
    console.error("TradingView webhook error", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
