"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseStrategyParams } from "@/lib/strategy-schema";
import { parseCustomConfig, parseInstruments } from "@/lib/custom-strategy";
import { PLANS, type Plan } from "@/lib/plans";
import type { StrategyKind, Prisma } from "@prisma/client";
import { getPostHogClient } from "@/lib/posthog-server";

export async function createBot({
  accountId,
  strategyId,
  strategyName,
  strategyKind,
  params,
  instruments,
  name,
}: {
  accountId?: string;
  strategyId?: string;
  strategyName?: string;
  strategyKind?: StrategyKind;
  params?: Record<string, unknown>;
  instruments?: string[];
  name?: string;
}) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Not signed in" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, plan: true } });
    if (!user) return { ok: false, error: "User not found" };

    const planConfig = PLANS[user.plan as Plan];

    // Enforce bot limits based on user plan
    const activeBotsCount = await prisma.bot.count({
      where: { userId: user.id },
    });

    if (activeBotsCount >= planConfig.accountLimit) {
      return { ok: false, error: `Your ${planConfig.name} plan is limited to ${planConfig.accountLimit} bot(s).` };
    }

    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: { bot: true },
      });
      if (!account || account.userId !== user.id) {
        return { ok: false, error: "Account not found or access denied" };
      }
      if (account.bot) {
        return { ok: false, error: "This account already has a bot attached." };
      }
    }

    // Assets are chosen at the bot, not baked into the strategy. Every bot must
    // name at least one instrument to trade.
    const botInstruments = parseInstruments(instruments);
    if (botInstruments.length === 0) {
      return { ok: false, error: "Choose at least one asset for the bot to trade." };
    }

    let finalStrategyId = strategyId;

    if (!finalStrategyId) {
      if (!strategyName || !strategyKind || !params) {
        return { ok: false, error: "Missing strategy details." };
      }

      const parsed = parseStrategyParams(params);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      // Strategies are asset-agnostic logic now: the risk envelope and (for
      // CUSTOM) the signal definition, but never the traded symbol.
      const finalParams: Record<string, unknown> = { ...parsed.params };

      if (strategyKind === "CUSTOM") {
        const custom = parseCustomConfig(params);
        if (!custom.ok) {
          return { ok: false, error: custom.error };
        }
        Object.assign(finalParams, custom.config);

        // Server-side pro language gate (defense in depth).
        if (
          custom.config.mode === "CODE" &&
          custom.config.language !== "javascript" &&
          user.plan === "FREE"
        ) {
          return { ok: false, error: "Python, Pine Script and TradingView strategies require a paid plan." };
        }

        // Generate a webhook secret for CODE strategies.
        if (custom.config.mode === "CODE") {
          finalParams.tvWebhookSecret = crypto.randomUUID();
        }
      }

      const activeStrategiesCount = await prisma.strategy.count({
        where: { userId: user.id },
      });

      if (activeStrategiesCount >= planConfig.strategyLimit) {
        return { ok: false, error: `Your ${planConfig.name} plan is limited to ${planConfig.strategyLimit} strategy(s).` };
      }

      const newStrategy = await prisma.strategy.create({
        data: {
          userId: user.id,
          name: strategyName,
          kind: strategyKind,
          params: finalParams as unknown as Prisma.InputJsonValue,
        },
      });
      finalStrategyId = newStrategy.id;
    } else {
      const existingStrategy = await prisma.strategy.findUnique({
        where: { id: finalStrategyId },
      });
      if (!existingStrategy || existingStrategy.userId !== user.id) {
        return { ok: false, error: "Strategy not found or access denied." };
      }
    }

    await prisma.bot.create({
      data: {
        userId: user.id,
        accountId: accountId ?? null,
        strategyId: finalStrategyId,
        name: name ?? "My Bot",
        status: "STOPPED",
        instruments: botInstruments,
      },
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "bot_created",
      properties: {
        strategy_kind: strategyKind,
        instrument_count: botInstruments.length,
        has_account: Boolean(accountId),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bots");
    return { ok: true };
  } catch (err) {
    console.error("createBot error", err);
    return { ok: false, error: "Failed to create bot." };
  }
}

/**
 * Update which assets a bot trades. Assets live on the bot, so this is how a user
 * re-points an existing bot at a different instrument (or adds several) without
 * touching the strategy. Scoped to the signed-in user's own bot.
 */
export async function updateBotInstruments(botId: string, instruments: string[]) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Not signed in" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!user) return { ok: false, error: "User not found" };

    const bot = await prisma.bot.findFirst({ where: { id: botId, userId: user.id }, select: { id: true } });
    if (!bot) return { ok: false, error: "Bot not found" };

    const clean = parseInstruments(instruments);
    if (clean.length === 0) return { ok: false, error: "Choose at least one asset for the bot to trade." };

    await prisma.bot.update({ where: { id: botId }, data: { instruments: clean } });

    revalidatePath("/dashboard/bots");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("updateBotInstruments error", err);
    return { ok: false, error: "Failed to update the bot's assets." };
  }
}

export async function connectBotToAccount(botId: string, accountId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { ok: false, error: "User not found" };

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || bot.userId !== user.id) {
      return { ok: false, error: "Bot not found" };
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { bot: true },
    });
    if (!account || account.userId !== user.id) {
      return { ok: false, error: "Account not found" };
    }

    if (account.bot) {
      return { ok: false, error: "Account already has a bot attached." };
    }

    await prisma.bot.update({
      where: { id: botId },
      data: { accountId },
    });

    revalidatePath("/dashboard/bots");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("connectBot error", err);
    return { ok: false, error: "Failed to connect bot." };
  }
}

export async function detachBot(botId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { ok: false, error: "User not found" };

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || bot.userId !== user.id) {
      return { ok: false, error: "Bot not found or access denied" };
    }

    await prisma.bot.update({
      where: { id: botId },
      data: { accountId: null },
    });

    revalidatePath("/dashboard/bots");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("detachBot error", err);
    return { ok: false, error: "Failed to detach bot." };
  }
}

export async function deleteBot(botId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { ok: false, error: "User not found" };

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || bot.userId !== user.id) {
      return { ok: false, error: "Bot not found or access denied" };
    }

    await prisma.bot.delete({ where: { id: botId } });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "bot_deleted",
      properties: { bot_id: botId },
    });

    revalidatePath("/dashboard/bots");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("deleteBot error", err);
    return { ok: false, error: "Failed to delete bot." };
  }
}

/** Start a forward test on a paper bot's account. Creates a ForwardTest record
 *  seeded with the strategy's validated baseline expectancy (if it exists). */
export async function startForwardTest(botId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Not signed in" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!user) return { ok: false, error: "User not found" };

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        strategy: { select: { id: true, params: true } },
        account: { select: { id: true, mode: true } },
      },
    });
    if (!bot || bot.userId !== user.id) return { ok: false, error: "Bot not found" };
    if (!bot.account) return { ok: false, error: "Bot has no account connected" };
    if (bot.account.mode !== "PAPER") return { ok: false, error: "Forward tests only run on paper accounts" };

    const existing = await prisma.forwardTest.findFirst({
      where: { accountId: bot.account.id, status: "RUNNING" },
    });
    if (existing) return { ok: false, error: "A forward test is already running for this account" };

    const params = (bot.strategy?.params ?? {}) as Record<string, unknown>;
    const rawEdge = params.edgeExpectancyR;
    const baselineExpectancy =
      rawEdge != null && !Number.isNaN(Number(rawEdge)) ? Number(rawEdge) : undefined;

    await prisma.forwardTest.create({
      data: {
        userId: user.id,
        strategyId: bot.strategyId,
        accountId: bot.account.id,
        targetTrades: 20,
        ...(baselineExpectancy !== undefined ? { baselineExpectancy } : {}),
      },
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "forward_test_started",
      properties: {
        bot_id: botId,
        strategy_id: bot.strategyId,
        has_baseline_expectancy: baselineExpectancy !== undefined,
      },
    });

    revalidatePath("/dashboard/bots");
    return { ok: true };
  } catch (err) {
    console.error("startForwardTest error", err);
    return { ok: false, error: "Failed to start forward test." };
  }
}

/** Mark a forward test as STOPPED. */
export async function stopForwardTest(ftId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Not signed in" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!user) return { ok: false, error: "User not found" };

    const ft = await prisma.forwardTest.findFirst({ where: { id: ftId, userId: user.id } });
    if (!ft) return { ok: false, error: "Forward test not found" };

    await prisma.forwardTest.update({ where: { id: ftId }, data: { status: "STOPPED" } });
    revalidatePath("/dashboard/bots");
    return { ok: true };
  } catch (err) {
    console.error("stopForwardTest error", err);
    return { ok: false, error: "Failed to stop forward test." };
  }
}

/**
 * Resume a bot that the edge-decay guard paused: clears the pause flag and
 * restarts it. Scoped to the signed-in user's own bot.
 */
export async function resumeEdgeDecay(botId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Not signed in" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!user) return { ok: false, error: "User not found" };

    const bot = await prisma.bot.findFirst({ where: { id: botId, userId: user.id }, select: { id: true } });
    if (!bot) return { ok: false, error: "Bot not found" };

    await prisma.bot.update({ where: { id: botId }, data: { edgeDecayPaused: false, status: "RUNNING" } });
    revalidatePath("/dashboard/bots");
    return { ok: true };
  } catch (err) {
    console.error("resumeEdgeDecay error", err);
    return { ok: false, error: "Failed to resume the bot." };
  }
}

/**
 * Update a bot's edge-decay threshold (the relative win-rate drop that pauses it).
 * Clamped to the UI's 0.01–1.0 range; null clears it (engine falls back to its
 * default). Scoped to the signed-in user's own bot.
 */
export async function updateBotEdgeDecayThreshold(botId: string, threshold: number | null) {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Not signed in" };

    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!user) return { ok: false, error: "User not found" };

    const bot = await prisma.bot.findFirst({ where: { id: botId, userId: user.id }, select: { id: true } });
    if (!bot) return { ok: false, error: "Bot not found" };

    const clamped =
      threshold == null || !Number.isFinite(threshold) ? null : Math.min(1, Math.max(0.01, threshold));
    await prisma.bot.update({ where: { id: botId }, data: { edgeDecayThreshold: clamped } });
    revalidatePath("/dashboard/bots");
    return { ok: true };
  } catch (err) {
    console.error("updateBotEdgeDecayThreshold error", err);
    return { ok: false, error: "Failed to update the threshold." };
  }
}
