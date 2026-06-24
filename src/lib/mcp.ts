import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "./db";
import { coerceStrategyParams, applyRawParam } from "./strategy-schema";

export const mcpServer = new McpServer({
  name: "Floqex",
  version: "1.0.0"
});

mcpServer.tool(
  "get_overview",
  "Fetch the user's account balances and bot status.",
  {
    clerkId: z.string().describe("The clerkId of the user to fetch overview for"),
  },
  async ({ clerkId }) => {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        accounts: { include: { bot: { include: { strategy: true } } } },
      },
    });

    if (!user) {
      return {
        content: [{ type: "text", text: "User not found or unauthorized." }],
        isError: true,
      };
    }

    const data = await Promise.all(
      user.accounts.map(async (acc) => {
        const trades = await prisma.trade.findMany({
          where: { accountId: acc.id },
          take: 5,
          orderBy: { createdAt: "desc" },
        });
        return {
          accountId: acc.id,
          nickname: acc.nickname,
          mode: acc.mode,
          balance: Number(acc.balance),
          botStatus: acc.bot?.status || "NO_BOT",
          strategyId: acc.bot?.strategyId || null,
          recentTrades: trades.map((t) => ({
            instrument: t.instrument,
            direction: t.direction,
            netPnl: t.netPnl ? Number(t.netPnl) : null,
          })),
        };
      })
    );

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

mcpServer.tool(
  "adjust_strategy",
  "Modify a bot's parameters safely.",
  {
    clerkId: z.string().describe("The clerkId of the user"),
    strategyId: z.string().describe("The ID of the strategy to modify"),
    paramKey: z.string().describe("The parameter key to modify (e.g. 'risk.maxDrawdown')"),
    newValue: z.string().describe("The new value for the parameter as a string"),
  },
  async ({ clerkId, strategyId, paramKey, newValue }) => {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });
    if (!user) {
      return { content: [{ type: "text", text: "Unauthorized" }], isError: true };
    }

    const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
    if (!strategy || strategy.userId !== user.id) {
      return { content: [{ type: "text", text: "Strategy not found" }], isError: true };
    }

    const currentParams = coerceStrategyParams(strategy.params);
    const result = applyRawParam(currentParams, paramKey, String(newValue));

    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
    }

    await prisma.strategy.update({
      where: { id: strategyId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { params: result.params as any },
    });

    return {
      content: [{ type: "text", text: `Successfully updated ${paramKey} to ${newValue}.` }],
    };
  }
);
