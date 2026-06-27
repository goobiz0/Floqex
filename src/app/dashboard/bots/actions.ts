"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseStrategyParams } from "@/lib/strategy-schema";
import { parseCustomConfig, parseInstruments } from "@/lib/custom-strategy";
import { PLANS, type Plan } from "@/lib/plans";
import type { StrategyKind, Prisma } from "@prisma/client";

export async function createBot({
  accountId,
  strategyId,
  strategyName,
  strategyKind,
  params,
  name,
}: {
  accountId?: string;
  strategyId?: string;
  strategyName?: string;
  strategyKind?: StrategyKind;
  params?: Record<string, unknown>;
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

    let finalStrategyId = strategyId;

    if (!finalStrategyId) {
      if (!strategyName || !strategyKind || !params) {
        return { ok: false, error: "Missing strategy details." };
      }

      const parsed = parseStrategyParams(params);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      const instruments = parseInstruments(
        (params as Record<string, unknown>).instruments ?? (params as Record<string, unknown>).instrument,
      );
      if (instruments.length === 0) {
        return { ok: false, error: "Choose at least one asset for the bot to trade." };
      }

      const finalParams: Record<string, unknown> = {
        ...parsed.params,
        instruments,
        instrument: instruments[0],
      };

      if (strategyKind === "CUSTOM") {
        const rawParams = params as Record<string, unknown>;
        // Server-side pro language gate (defense in depth) before any transpilation.
        if (
          rawParams.mode === "CODE" &&
          rawParams.language !== "javascript" &&
          user.plan === "FREE"
        ) {
          return { ok: false, error: "Python, Pine Script and TradingView strategies require a paid plan." };
        }

        const custom = parseCustomConfig(params);
        if (!custom.ok) {
          return { ok: false, error: custom.error };
        }
        Object.assign(finalParams, custom.config);
        finalParams.instruments = custom.instruments;
        finalParams.instrument = custom.instruments[0];

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

    revalidatePath("/dashboard/bots");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("deleteBot error", err);
    return { ok: false, error: "Failed to delete bot." };
  }
}
