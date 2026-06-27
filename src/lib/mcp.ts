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

mcpServer.tool(
  "get_strategy_details",
  "Fetch the full code, parameters, and details of a specific strategy.",
  {
    clerkId: z.string().describe("The clerkId of the user"),
    strategyId: z.string().describe("The ID of the strategy"),
  },
  async ({ clerkId, strategyId }) => {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }], isError: true };

    const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
    if (!strategy || strategy.userId !== user.id) {
      return { content: [{ type: "text", text: "Strategy not found" }], isError: true };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(strategy, null, 2) }],
    };
  }
);

mcpServer.tool(
  "update_strategy_code",
  "Update the JavaScript, Python, or Pine Script code of a custom strategy.",
  {
    clerkId: z.string().describe("The clerkId of the user"),
    strategyId: z.string().describe("The ID of the strategy to update"),
    newCode: z.string().describe("The new strategy code"),
  },
  async ({ clerkId, strategyId, newCode }) => {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }], isError: true };

    const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
    if (!strategy || strategy.userId !== user.id || strategy.kind !== "CUSTOM") {
      return { content: [{ type: "text", text: "Custom strategy not found" }], isError: true };
    }

    const params = strategy.params as Record<string, any>;
    if (params.mode !== "CODE") {
      return { content: [{ type: "text", text: "Strategy is not in CODE mode" }], isError: true };
    }

    params.code = newCode;

    await prisma.strategy.update({
      where: { id: strategyId },
      data: { params: params as any },
    });

    return {
      content: [{ type: "text", text: "Successfully updated strategy code." }],
    };
  }
);

mcpServer.tool(
  "get_bot_logs",
  "Fetch the recent execution logs (agent events) for a specific bot.",
  {
    clerkId: z.string().describe("The clerkId of the user"),
    botId: z.string().describe("The ID of the bot"),
  },
  async ({ clerkId, botId }) => {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }], isError: true };

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: { account: true },
    });
    if (!bot || bot.account.userId !== user.id) {
      return { content: [{ type: "text", text: "Bot not found" }], isError: true };
    }

    const logs = await prisma.agentEvent.findMany({
      where: { accountId: bot.accountId },
      orderBy: { ts: "desc" },
      take: 50,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(logs, null, 2) }],
    };
  }
);

mcpServer.tool(
  "control_bot",
  "Start, stop, or pause a bot.",
  {
    clerkId: z.string().describe("The clerkId of the user"),
    botId: z.string().describe("The ID of the bot"),
    action: z.enum(["START", "STOP"]).describe("The action to perform"),
  },
  async ({ clerkId, botId, action }) => {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }], isError: true };

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || bot.userId !== user.id) {
      return { content: [{ type: "text", text: "Bot not found" }], isError: true };
    }

    const newStatus = action === "START" ? "RUNNING" : "STOPPED";

    await prisma.bot.update({
      where: { id: botId },
      data: { status: newStatus },
    });

    return {
      content: [{ type: "text", text: `Bot ${botId} is now ${newStatus}.` }],
    };
  }
);

mcpServer.tool(
  "get_trade_analytics",
  "Get detailed performance analytics for an account's trades.",
  {
    clerkId: z.string().describe("The clerkId of the user"),
    accountId: z.string().describe("The ID of the account"),
  },
  async ({ clerkId, accountId }) => {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }], isError: true };

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== user.id) {
      return { content: [{ type: "text", text: "Account not found" }], isError: true };
    }

    const trades = await prisma.trade.findMany({
      where: { accountId, status: "CLOSED" },
      orderBy: { closedAt: "asc" },
    });

    if (trades.length === 0) {
      return { content: [{ type: "text", text: "No closed trades found for this account." }] };
    }

    let totalProfit = 0;
    let totalLoss = 0;
    let wins = 0;
    let maxDrawdown = 0;
    let peak = 0;
    let runningPnl = 0;

    for (const t of trades) {
      const pnl = Number(t.netPnl || 0);
      runningPnl += pnl;
      if (runningPnl > peak) peak = runningPnl;
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      if (pnl > 0) {
        totalProfit += pnl;
        wins++;
      } else {
        totalLoss += Math.abs(pnl);
      }
    }

    const winRate = (wins / trades.length) * 100;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

    const analytics = {
      totalTrades: trades.length,
      winRate: `${winRate.toFixed(1)}%`,
      profitFactor: profitFactor.toFixed(2),
      netProfit: totalProfit - totalLoss,
      maxDrawdown,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(analytics, null, 2) }],
    };
  }
);

mcpServer.tool(
  "get_active_positions",
  "List currently open trades/positions for an account.",
  {
    clerkId: z.string().describe("The clerkId of the user"),
    accountId: z.string().describe("The ID of the account"),
  },
  async ({ clerkId, accountId }) => {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }], isError: true };

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== user.id) {
      return { content: [{ type: "text", text: "Account not found" }], isError: true };
    }

    const trades = await prisma.trade.findMany({
      where: { accountId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });

    return {
      content: [{ type: "text", text: JSON.stringify(trades, null, 2) }],
    };
  }
);
