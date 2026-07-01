"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";
import { parseSymbolFilter, type CopySizingMode, type CopyFilterMode } from "@/lib/copy-trading";
import { getPostHogClient } from "@/lib/posthog-server";

type Result = { ok: boolean; error?: string; warning?: string };

const SIZING_MODES: CopySizingMode[] = ["MIRROR", "MULTIPLIER", "PROPORTIONAL", "FIXED"];
const FILTER_MODES: CopyFilterMode[] = ["ALLOW", "DENY"];
const MAX_FILTER_TOKENS = 40;

const CHAIN_ERROR = "That pairing would create a copy chain. An account can be a master or a follower, not both.";

type LinkSettings = {
  sizingMode: CopySizingMode;
  multiplier?: number;
  fixedUnits?: number | null;
  maxRiskPct?: number | null;
  minUnits?: number | null;
  maxUnits?: number | null;
  symbolFilter?: string | null;
  symbolFilterMode?: CopyFilterMode;
  maxDailyLossPct?: number | null;
  reverse?: boolean;
  copyOpen?: boolean;
  copyClose?: boolean;
};

type NormalizedSettings = {
  sizingMode: CopySizingMode;
  multiplier: number;
  fixedUnits: number | null;
  maxRiskPct: number | null;
  minUnits: number | null;
  maxUnits: number | null;
  symbolFilter: string | null;
  symbolFilterMode: CopyFilterMode;
  maxDailyLossPct: number | null;
  reverse: boolean;
  copyOpen: boolean;
  copyClose: boolean;
};

/** Resolve the signed-in user and gate the whole surface on entitlement. */
async function requireEntitledUser(): Promise<
  { ok: true; user: { id: string; plan: Plan } } | { ok: false; error: string }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "You are not signed in." };
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, plan: true } });
  if (!user) return { ok: false, error: "Account not found." };
  const plan = (user.plan as Plan) || "FREE";
  if (!PLANS[plan]?.copyTrading) {
    return { ok: false, error: "Copy trading is a paid feature. Upgrade to Pro or Elite to use it." };
  }
  return { ok: true, user: { id: user.id, plan } };
}

/** A positive, finite optional number, or an error if the value is malformed. */
function optionalPositive(value: number | undefined | null, label: string, max?: number, scale?: number): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: `${label} must be greater than zero.` };
  if (max !== undefined && value > max) return { ok: false, error: `${label} must be ${max} or less.` };
  const val = scale !== undefined ? Number(value.toFixed(scale)) : value;
  return { ok: true, value: val };
}

/** Validate and normalize the link sizing rule (shared by create + update). */
function normalizeSettings(s: LinkSettings):
  | { ok: true; data: NormalizedSettings }
  | { ok: false; error: string } {
  if (!SIZING_MODES.includes(s.sizingMode)) return { ok: false, error: "Choose a valid sizing mode." };

  const multiplier = s.multiplier ?? 1;
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100) {
    return { ok: false, error: "Multiplier must be between 0 and 100." };
  }

  let fixedUnits: number | null = s.fixedUnits ?? null;
  if (s.sizingMode === "FIXED") {
    if (fixedUnits === null || !Number.isFinite(fixedUnits) || fixedUnits <= 0) {
      return { ok: false, error: "Enter a fixed size greater than zero." };
    }
  } else {
    fixedUnits = null; // only meaningful for FIXED
  }

  const maxRisk = optionalPositive(s.maxRiskPct, "Max risk per trade", 100, 3);
  if (!maxRisk.ok) return { ok: false, error: maxRisk.error };

  const minU = optionalPositive(s.minUnits, "Minimum size", undefined, 4);
  if (!minU.ok) return { ok: false, error: minU.error };
  const maxU = optionalPositive(s.maxUnits, "Maximum size", undefined, 4);
  if (!maxU.ok) return { ok: false, error: maxU.error };
  if (minU.value !== null && maxU.value !== null && minU.value > maxU.value) {
    return { ok: false, error: "Minimum size cannot be larger than the maximum size." };
  }

  const dailyLoss = optionalPositive(s.maxDailyLossPct, "Daily loss limit", 100, 3);
  if (!dailyLoss.ok) return { ok: false, error: dailyLoss.error };

  const symbolFilterMode: CopyFilterMode = FILTER_MODES.includes(s.symbolFilterMode as CopyFilterMode)
    ? (s.symbolFilterMode as CopyFilterMode)
    : "ALLOW";
  const tokens = parseSymbolFilter(s.symbolFilter);
  if (tokens.length > MAX_FILTER_TOKENS) {
    return { ok: false, error: `Symbol filter is limited to ${MAX_FILTER_TOKENS} instruments.` };
  }
  const symbolFilter = tokens.length > 0 ? tokens.join(", ") : null;

  return {
    ok: true,
    data: {
      sizingMode: s.sizingMode,
      multiplier,
      fixedUnits,
      maxRiskPct: maxRisk.value,
      minUnits: minU.value,
      maxUnits: maxU.value,
      symbolFilter,
      symbolFilterMode,
      maxDailyLossPct: dailyLoss.value,
      reverse: Boolean(s.reverse),
      copyOpen: s.copyOpen ?? true,
      copyClose: s.copyClose ?? true,
    },
  };
}

export async function createCopyLink(
  input: { masterAccountId: string; followerAccountId: string } & LinkSettings,
): Promise<Result> {
  const gate = await requireEntitledUser();
  if (!gate.ok) return { ok: false, error: gate.error };
  const { user } = gate;

  const { masterAccountId, followerAccountId } = input;
  if (!masterAccountId || !followerAccountId) return { ok: false, error: "Pick a master and a follower account." };
  if (masterAccountId === followerAccountId) return { ok: false, error: "An account cannot copy itself." };

  const settings = normalizeSettings(input);
  if (!settings.ok) return { ok: false, error: settings.error };

  try {
    // Both accounts must belong to the signed-in user.
    const accounts = await prisma.account.findMany({
      where: { id: { in: [masterAccountId, followerAccountId] }, userId: user.id },
      select: { id: true, bot: { select: { id: true } } },
    });
    const master = accounts.find((a) => a.id === masterAccountId);
    const follower = accounts.find((a) => a.id === followerAccountId);
    if (!master || !follower) return { ok: false, error: "One of the accounts was not found on your profile." };

    // Keep the graph a clean hub-and-spoke: no chains, no reciprocal loops. A
    // follower cannot also be a master, and a master cannot also be a follower.
    await prisma.$transaction(async (tx) => {
      const conflicts = await tx.copyLink.findMany({
        where: {
          userId: user.id,
          OR: [{ masterAccountId: followerAccountId }, { followerAccountId: masterAccountId }],
        },
        select: { id: true },
      });
      if (conflicts.length > 0) {
        throw new Error(CHAIN_ERROR);
      }

      return await tx.copyLink.create({
        data: {
          userId: user.id,
          masterAccountId,
          followerAccountId,
          ...settings.data,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "copy_link_created",
      properties: {
        sizing_mode: input.sizingMode,
        has_symbol_filter: Boolean(input.symbolFilter),
        reverse: Boolean(input.reverse),
      },
    });

    revalidatePath("/dashboard/copy-trading");
    return follower.bot
      ? { ok: true }
      : { ok: true, warning: "This follower has no bot attached yet, so copies will be skipped until you connect one." };
  } catch (err) {
    if (err instanceof Error && err.message === CHAIN_ERROR) {
      return { ok: false, error: err.message };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Those two accounts are already linked." };
    }
    console.error("createCopyLink error", err);
    return { ok: false, error: "Could not create the copy link." };
  }
}

export async function updateCopyLink(id: string, settings: LinkSettings): Promise<Result> {
  const gate = await requireEntitledUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const normalized = normalizeSettings(settings);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  try {
    const link = await prisma.copyLink.findUnique({ where: { id }, select: { userId: true } });
    if (!link || link.userId !== gate.user.id) return { ok: false, error: "Copy link not found." };

    await prisma.copyLink.update({ where: { id }, data: normalized.data });
    revalidatePath("/dashboard/copy-trading");
    return { ok: true };
  } catch (err) {
    console.error("updateCopyLink error", err);
    return { ok: false, error: "Could not update the copy link." };
  }
}

export async function toggleCopyLink(id: string): Promise<Result> {
  const gate = await requireEntitledUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  try {
    const link = await prisma.copyLink.findUnique({ where: { id }, select: { userId: true, status: true } });
    if (!link || link.userId !== gate.user.id) return { ok: false, error: "Copy link not found." };

    // Either direction clears any stale breaker note: a manual pause is not a
    // breaker trip, and resuming should arm the link fresh.
    const newStatus = link.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await prisma.copyLink.update({
      where: { id },
      data: { status: newStatus, pausedReason: null },
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: gate.user.id,
      event: "copy_link_toggled",
      properties: { new_status: newStatus },
    });

    revalidatePath("/dashboard/copy-trading");
    return { ok: true };
  } catch (err) {
    console.error("toggleCopyLink error", err);
    return { ok: false, error: "Could not change the link status." };
  }
}

export async function deleteCopyLink(id: string): Promise<Result> {
  const gate = await requireEntitledUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  try {
    const link = await prisma.copyLink.findUnique({ where: { id }, select: { userId: true } });
    if (!link || link.userId !== gate.user.id) return { ok: false, error: "Copy link not found." };

    const openEvents = await prisma.copyTradeEvent.findMany({
      where: { copyLinkId: id, action: "OPEN", status: "FILLED", followerTradeId: { not: null } },
      select: { followerTradeId: true },
    });

    if (openEvents.length > 0) {
      const followerTradeIds = openEvents.map((e) => e.followerTradeId!);
      const activeTrades = await prisma.trade.count({
        where: {
          id: { in: followerTradeIds },
          status: "OPEN",
        },
      });
      if (activeTrades > 0) {
        return { ok: false, error: "Cannot delete this link while there are open copied trades. Please pause the link or close the positions first." };
      }
    }

    await prisma.copyLink.delete({ where: { id } });
    revalidatePath("/dashboard/copy-trading");
    return { ok: true };
  } catch (err) {
    console.error("deleteCopyLink error", err);
    return { ok: false, error: "Could not remove the copy link." };
  }
}
