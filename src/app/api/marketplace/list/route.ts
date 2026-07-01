import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { z } from "zod";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

const MarketplaceListSchema = z.object({
  strategyId: z.string().max(100),
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(5000),
  category: z.string().max(100).optional(),
  priceUsd: z.number().min(0).max(10000),
}).strict();

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const rateLimitSuccess = await checkRateLimit(`marketplace_list_${ip}`, 10, "1 m");
    if (!rateLimitSuccess) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Invalid JSON payload", { status: 400 });
    }

    const parsedBody = MarketplaceListSchema.safeParse(body);
    if (!parsedBody.success) {
      return new NextResponse(parsedBody.error.message, { status: 400 });
    }

    const { strategyId, title, description, category, priceUsd } = parsedBody.data;

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
