import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { parseStrategyParams } from "@/lib/strategy-schema";
import { parseCustomConfig } from "@/lib/custom-strategy";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length > 60) {
      return NextResponse.json(
        { error: "Keep the name under 60 characters." },
        { status: 400 }
      );
    }

    const rawParams =
      body.params && typeof body.params === "object" ? body.params : {};

    // Defense in depth: validate the same way the dashboard server action does
    // (see createStrategyAdvanced in dashboard/strategy/actions.ts). Risk bounds
    // first, then the custom entry logic / instruments. Persist only the
    // sanitized, normalized shape rather than the raw client payload.
    const risk = parseStrategyParams(rawParams);
    if (!risk.ok) return NextResponse.json({ error: risk.error }, { status: 400 });

    const custom = parseCustomConfig(rawParams);
    if (!custom.ok) return NextResponse.json({ error: custom.error }, { status: 400 });

    const params: Record<string, unknown> = {
      ...risk.params,
      instruments: custom.instruments,
      instrument: custom.instruments[0],
      ...custom.config,
    };

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: { include: { bot: true } },
        strategies: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const bot = user.accounts[0]?.bot;
    const strategyId = bot ? bot.strategyId : user.strategies[0]?.id;

    if (!strategyId) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });

    // Ownership guard: only mutate a strategy that belongs to this user.
    const owned = user.strategies.some((s) => s.id === strategyId);
    if (!owned) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    await prisma.strategy.update({
      where: { id: strategyId },
      data: {
        kind: "CUSTOM",
        name: name || "Custom Strategy",
        params: params as unknown as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/dashboard/strategy");
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Failed to deploy custom strategy:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
