"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PLANS, type Plan } from "@/lib/plans";
import { getOrCreateUser } from "@/lib/user";
import { DEFAULT_PARAMS } from "@/lib/strategy-schema";
import { encrypt } from "@/lib/crypto";
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
  try {
    // getOrCreateUser tolerates the Clerk webhook lagging right after sign-up,
    // so onboarding never fails with a "not synced yet" error.
    const user = await getOrCreateUser();
    if (!user) return { ok: false, error: "Not signed in" };

    const planConfig = PLANS[user.plan as Plan];

    if (mode === "LIVE" && !planConfig.liveTrading) {
      return { ok: false, error: "Upgrade to Trader or Pro to connect a Live account." };
    }

    const accountCount = await prisma.account.count({ where: { userId: user.id } });
    if (accountCount >= planConfig.accountLimit) {
      return { ok: false, error: `Your ${planConfig.name} plan is limited to ${planConfig.accountLimit} account(s). Please upgrade.` };
    }

    if (broker !== "PAPER") {
      if (!apiKey || apiKey.length < 5 || !apiSecret || apiSecret.length < 5) {
        return { ok: false, error: "Invalid API credentials for the selected broker." };
      }

      // Verify keys if Alpaca
      if (broker === "ALPACA") {
        const baseUrl = mode === "PAPER" ? "https://paper-api.alpaca.markets" : "https://api.alpaca.markets";
        try {
          const verifyRes = await fetch(`${baseUrl}/v2/account`, {
            headers: {
              "APCA-API-KEY-ID": apiKey,
              "APCA-API-SECRET-KEY": apiSecret,
            },
          });
          if (!verifyRes.ok) {
            return { ok: false, error: "Invalid Alpaca API keys or insufficient permissions." };
          }
        } catch {
          return { ok: false, error: "Could not reach Alpaca servers to verify keys." };
        }
      }
    }

    let strategy = await prisma.strategy.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    if (!strategy) {
      strategy = await prisma.strategy.create({
        data: {
          userId: user.id,
          name: "Opening Range Breakout",
          kind: "ORB",
          // Matches the Strategy Lab contract (src/lib/strategy-schema.ts) so the
          // params render and validate consistently once the account is created.
          params: DEFAULT_PARAMS as object,
        },
      });
    }

    // Live credentials are stored encrypted at rest (never returned to the
    // client). Paper accounts carry no connection, so onboarding never needs the
    // encryption key.
    const connection =
      broker !== "PAPER" && apiKey && apiSecret
        ? {
            create: {
              provider: broker,
              encrypted: encrypt(JSON.stringify({ apiKey, apiSecret })),
              status: "CONNECTED",
              lastVerifiedAt: new Date(),
            },
          }
        : undefined;

    await prisma.account.create({
      data: {
        userId: user.id,
        nickname,
        broker,
        mode,
        balance: mode === "PAPER" ? 10000 : 0,
        currency: "USD",
        isActive: true,
        connection,
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

    // Enforce the plan's bot limit server-side: a downgraded user can always
    // stop a bot, but cannot start one beyond their allowance (the oldest N
    // accounts), regardless of what the UI shows.
    if (newStatus === "RUNNING") {
      const limit = PLANS[user.plan as Plan].accountLimit;
      if (Number.isFinite(limit)) {
        const allowed = await prisma.account.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
          select: { id: true },
          take: limit,
        });
        if (!allowed.some((a) => a.id === account.id)) {
          return { ok: false, error: "Plan limit reached. Upgrade to start this bot." };
        }
      }
    }

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

export async function updateCircuitBreaker(accountId: string, amount: number | null) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in" };

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { ok: false, error: "User not found" };

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== user.id) {
      return { ok: false, error: "Account not found" };
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { maxDailyDrawdown: amount },
    });

    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (err) {
    console.error("updateCircuitBreaker error", err);
    return { ok: false, error: "Could not update circuit breaker" };
  }
}

export async function disconnectAccount(accountId: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in" };

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { ok: false, error: "User not found" };

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== user.id) {
      return { ok: false, error: "Account not found" };
    }

    // Prisma Cascade delete handles related bots, trades, etc.
    await prisma.account.delete({
      where: { id: accountId }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/accounts");
    return { ok: true };
  } catch (err) {
    console.error("disconnectAccount error", err);
    return { ok: false, error: "Could not disconnect account" };
  }
}
