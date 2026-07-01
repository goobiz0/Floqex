import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { parseStrategyParams } from "@/lib/strategy-schema";
import { parseCustomConfig } from "@/lib/custom-strategy";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

const DeployCustomSchema = z.object({
  name: z.string().min(1).max(60),
  params: z.record(z.any()),
}).strict();

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const success = await checkRateLimit(`deploy_custom_${userId}`, 10, "1 m");
    if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parsedBody = DeployCustomSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
    }

    const { name, params: rawParams } = parsedBody.data;

    // Defense in depth: validate the same way the dashboard server action does
    // (see createStrategyAdvanced in dashboard/strategy/actions.ts). Risk bounds
    // first, then the custom entry logic / instruments. Persist only the
    // sanitized, normalized shape rather than the raw client payload.
    const risk = parseStrategyParams(rawParams);
    if (!risk.ok) return NextResponse.json({ error: risk.error }, { status: 400 });

    const custom = parseCustomConfig(rawParams);
    if (!custom.ok) return NextResponse.json({ error: custom.error }, { status: 400 });

    // Assets live on the bot now, so they are optional here. When the caller does
    // supply instruments we keep them on the strategy params purely as a fallback
    // for bots that have none of their own (legacy bots).
    const params: Record<string, unknown> = {
      ...risk.params,
      ...custom.config,
      ...(custom.instruments.length > 0
        ? { instruments: custom.instruments, instrument: custom.instruments[0] }
        : {}),
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
