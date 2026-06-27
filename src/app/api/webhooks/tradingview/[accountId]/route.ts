import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";
import { validateRisk } from "@/lib/engine/risk-engine";
import { executeTrade, closeTrade } from "@/lib/engine/execution-router";

export const runtime = "nodejs";

interface WebhookPayload {
  action?: string;
  ticker?: string;
  price?: number;
  stop?: number;
  target?: number;
  size?: number;
}

export async function POST(req: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const p = await params;
    const { accountId } = p;

    // Extract secret from ?secret= query param or x-webhook-secret header.
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret") ?? "";
    const headerSecret = req.headers.get("x-webhook-secret") ?? "";
    const providedSecret = querySecret || headerSecret;

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        user: true,
        bot: {
          include: {
            strategy: true,
            trades: { where: { status: "OPEN" }, take: 1 },
          },
        },
      },
    });

    if (!account || !account.bot) {
      return new NextResponse("Account or Bot not found", { status: 404 });
    }

    // Require non-FREE plan.
    const planConfig = PLANS[account.user.plan as Plan] || PLANS.FREE;
    if (account.user.plan === "FREE") {
      return new NextResponse("TradingView webhooks require a paid plan", { status: 403 });
    }
    void planConfig;

    // Validate the webhook secret against the one stored in strategy params.
    const strategyParams = (account.bot.strategy?.params ?? {}) as Record<string, unknown>;
    const storedSecret = typeof strategyParams.tvWebhookSecret === "string" ? strategyParams.tvWebhookSecret : null;

    if (!storedSecret || !providedSecret || providedSecret !== storedSecret) {
      return new NextResponse("Invalid or missing webhook secret", { status: 401 });
    }

    if (account.bot.status !== "RUNNING") {
      return new NextResponse("Bot is not running", { status: 400 });
    }

    let payload: WebhookPayload;
    try {
      payload = (await req.json()) as WebhookPayload;
    } catch {
      return new NextResponse("Invalid JSON payload", { status: 400 });
    }

    const action = (payload.action ?? "").toLowerCase();
    if (!action) {
      return new NextResponse("Missing action field (buy | sell | close)", { status: 400 });
    }

    const ticker = payload.ticker || (strategyParams.instrument as string) || "CUSTOM";
    const openTrade = account.bot.trades[0] ?? null;

    // --- CLOSE action ---
    if (action === "close") {
      if (!openTrade) {
        return NextResponse.json({ ok: true, message: "No open trade to close." });
      }
      const exitPrice = payload.price ?? Number(openTrade.entryPrice);
      const closed = await closeTrade(openTrade.id, accountId, "TV_WEBHOOK", exitPrice);

      await prisma.agentEvent.create({
        data: {
          botId: account.bot.id,
          accountId,
          kind: "TRADE",
          message: `TradingView webhook: closed ${openTrade.direction} ${ticker} at ${exitPrice.toFixed(2)}.`,
        },
      });

      void closed;
      return NextResponse.json({ ok: true, message: "Trade closed.", tradeId: openTrade.id });
    }

    // --- BUY / SELL (entry) actions ---
    if (action !== "buy" && action !== "sell") {
      return new NextResponse("Unknown action. Use buy | sell | close.", { status: 400 });
    }

    // Guard against double-open.
    if (openTrade) {
      return NextResponse.json({ ok: false, message: "A trade is already open. Close it first." }, { status: 409 });
    }

    const isLong = action === "buy";
    const direction = isLong ? "LONG" : "SHORT";

    // Fill missing stop/target from strategy risk settings.
    const stopLossPct = Number(strategyParams.stopLossPct) || 0.5;
    const targetRatio = Number(strategyParams.targetRatio) || 2;
    const entryPrice = payload.price ?? 0;

    if (entryPrice <= 0) {
      return new NextResponse("Missing or invalid price field", { status: 400 });
    }

    const stopPrice = payload.stop ?? (isLong
      ? entryPrice * (1 - stopLossPct / 100)
      : entryPrice * (1 + stopLossPct / 100));

    const riskAmt = Math.abs(entryPrice - stopPrice);
    const targetPrice = payload.target ?? (isLong
      ? entryPrice + riskAmt * targetRatio
      : entryPrice - riskAmt * targetRatio);

    const signal = {
      direction,
      entryPrice,
      stopPrice,
      targetPrice,
    } as const;

    // Validate risk (sizing, circuit breakers, plan limits).
    const riskCheck = await validateRisk(account.bot.id, accountId, signal, strategyParams);
    if (!riskCheck.passed) {
      return NextResponse.json({ ok: false, message: `Risk check failed: ${riskCheck.reason}` }, { status: 422 });
    }

    const trade = await executeTrade(
      account.bot.id,
      accountId,
      signal,
      { sizeUnits: payload.size ?? riskCheck.sizeUnits ?? 1, riskPct: riskCheck.riskPct ?? 1 },
      ticker,
    );

    await prisma.agentEvent.create({
      data: {
        botId: account.bot.id,
        accountId,
        kind: "TRADE",
        message: `TradingView webhook: entered ${direction} ${ticker} at ${entryPrice.toFixed(2)}, stop ${stopPrice.toFixed(2)}, target ${targetPrice.toFixed(2)}.`,
      },
    });

    return NextResponse.json({ ok: true, message: "Trade executed.", tradeId: trade.id });
  } catch (error) {
    console.error("TradingView webhook error", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
