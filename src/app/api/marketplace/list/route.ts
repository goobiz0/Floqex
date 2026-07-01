import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { strategyId, title, description, category, priceUsd } = body;

    if (!strategyId || !title || !description || priceUsd === undefined) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const price = Number(priceUsd);

    if (user.plan === "FREE" && price > 0) {
      return new NextResponse("Free users can only list free strategies. Upgrade to PRO or ELITE to sell strategies.", { status: 403 });
    }

    // Verify strategy ownership and forward test status
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      include: {
        forwardTests: {
          where: { status: "PASSED" }
        }
      }
    });

    if (!strategy || strategy.userId !== user.id) {
      return new NextResponse("Strategy not found or unauthorized", { status: 404 });
    }

    if (strategy.forwardTests.length === 0) {
      return new NextResponse("Strategy must pass a forward test before it can be listed.", { status: 400 });
    }

    // Upsert listing (create new or update if existing DRAFT)
    const listing = await prisma.marketplaceListing.create({
      data: {
        sellerId: user.id,
        strategyId,
        title,
        description,
        category: category || "Breakout",
        priceUsd: price,
        status: "ACTIVE" // By default making it active for simplicity
      }
    });

    return NextResponse.json(listing);
  } catch (error) {
    console.error("[MARKETPLACE_LISTING]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
