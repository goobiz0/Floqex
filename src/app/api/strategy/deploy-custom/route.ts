import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, params } = body;

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

    await prisma.strategy.update({
      where: { id: strategyId },
      data: { 
        kind: "CUSTOM",
        name: name || "Custom Strategy",
        params: params 
      },
    });

    revalidatePath("/dashboard/strategy");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Failed to deploy custom strategy:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
