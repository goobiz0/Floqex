"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const PLAN_LIMITS = {
  FREE: 2,
  TRADER: 3,
  PRO: 4,
  ELITE: 5,
};

export type WidgetLayout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  config: Record<string, any>;
};

export async function getDashboardTemplates() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true }
  });
  
  if (!user) return [];

  return prisma.dashboardTemplate.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
}

export async function createDashboardTemplate(name: string, layout: WidgetLayout[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      _count: {
        select: { dashboardTemplates: true }
      }
    }
  });

  if (!user) throw new Error("User not found");

  const limit = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;

  if (user._count.dashboardTemplates >= limit) {
    return { error: `Plan limit reached. Your ${user.plan} plan allows up to ${limit} templates.` };
  }

  const isFirst = user._count.dashboardTemplates === 0;

  const template = await prisma.dashboardTemplate.create({
    data: {
      userId: user.id,
      name,
      layout,
      isDefault: isFirst,
    }
  });

  revalidatePath("/dashboard");
  return { data: template };
}

export async function updateDashboardTemplate(id: string, layout: WidgetLayout[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  const template = await prisma.dashboardTemplate.findFirst({
    where: { id, userId: user.id }
  });

  if (!template) {
    return { error: "Template not found" };
  }

  const updated = await prisma.dashboardTemplate.update({
    where: { id },
    data: { layout }
  });

  revalidatePath("/dashboard");
  return { data: updated };
}

export async function deleteDashboardTemplate(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  await prisma.dashboardTemplate.deleteMany({
    where: { id, userId: user.id }
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function setDefaultTemplate(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  await prisma.$transaction([
    prisma.dashboardTemplate.updateMany({
      where: { userId: user.id },
      data: { isDefault: false }
    }),
    prisma.dashboardTemplate.update({
      where: { id },
      data: { isDefault: true }
    })
  ]);

  revalidatePath("/dashboard");
  return { success: true };
}
