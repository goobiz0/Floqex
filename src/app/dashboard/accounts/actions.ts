"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PLANS, type Plan } from "@/lib/plans";
import type { Broker, AccountMode, BotStatus } from "@prisma/client";

export async function connectAccount({
  nickname,
  broker,
  mode,
  apiKey,
  apiSecret,
}: {
  nickname: string;
  broker: Broker;
  mode: AccountMode;
  apiKey?: string;
  apiSecret?: string;
}) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in" };

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        _count: { select: { accounts: true } },
        strategies: { take: 1 },
      },
    });

    if (!user) {
      return { ok: false, error: "User profile not synced to database yet. Please contact support." };
    }

    const planConfig = PLANS[user.plan as Plan];

    if (mode === "LIVE" && !planConfig.liveTrading) {
      return { ok: false, error: "Upgrade to Trader or Pro to connect a Live account." };
    }

    if (user._count.accounts >= planConfig.accountLimit) {
      return { ok: false, error: `Your ${planConfig.name} plan is limited to ${planConfig.accountLimit} account(s). Please upgrade.` };
    }

    if (broker !== "PAPER") {
      if (!apiKey || apiKey.length < 5 || !apiSecret || apiSecret.length < 5) {
        return { ok: false, error: "Invalid API credentials for the selected broker." };
      }
      // In a real app, verify keys against the broker API here, then encrypt before saving.
    }

    let strategy = user.strategies[0];
    if (!strategy) {
      strategy = await prisma.strategy.create({
        data: {
          userId: user.id,
          name: "Default ORB",
          kind: "ORB",
          params: {
            "session": "NY",
            "riskPct": 0.5,
            "maxLoss": 3,
            "targetR": 2,
          },
        },
      });
    }

    await prisma.account.create({
      data: {
        userId: user.id,
        nickname,
        broker,
        mode,
        balance: mode === "PAPER" ? 10000 : 0,
        currency: "USD",
        isActive: true,
        bot: {
          create: {
            strategyId: strategy.id,
            status: "STOPPED",
          },
        },
      },
    });

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("connectAccount error", err);
    return { ok: false, error: "Something went wrong saving your account." };
  }
}

export async function toggleBotStatus(accountId: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in" };

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { ok: false, error: "User not found" };

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { bot: true },
    });

    if (!account || account.userId !== user.id) {
      return { ok: false, error: "Account not found" };
    }

    if (!account.bot) {
      return { ok: false, error: "No bot attached to this account" };
    }

    const newStatus: BotStatus = account.bot.status === "RUNNING" ? "STOPPED" : "RUNNING";

    await prisma.bot.update({
      where: { id: account.bot.id },
      data: { status: newStatus },
    });

    revalidatePath("/dashboard");
    return { ok: true, status: newStatus };
  } catch (err) {
    console.error("toggleBotStatus error", err);
    return { ok: false, error: "Could not toggle bot status" };
  }
}

export async function emergencyStop() {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in" };

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { ok: false, error: "User not found" };

    const bots = await prisma.bot.findMany({
      where: { account: { userId: user.id } },
    });

    await prisma.bot.updateMany({
      where: { id: { in: bots.map(b => b.id) } },
      data: { status: "STOPPED" },
    });

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("emergencyStop error", err);
    return { ok: false, error: "Could not execute emergency stop" };
  }
}
