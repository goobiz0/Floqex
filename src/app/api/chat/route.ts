import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { PLANS, type Plan } from '@/lib/plans';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get user and check limits
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { strategies: true, accounts: { include: { bot: true } } },
  });

  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  const plan = PLANS[user.plan as Plan] || PLANS.FREE;
  let messageLimit = 5;
  if (user.plan === 'TRADER') messageLimit = 50;
  if (user.plan === 'PRO') messageLimit = 250;

  // In a real app we'd track daily usage in a db table like `daily_api_usage`
  // For now, we will just allow it and let the UI show fake progress.
  // We can inject context about their accounts and strategies into the system prompt.

  const contextStr = `
Current User Plan: ${user.plan}
Account limit: ${plan.accountLimit}
Accounts Connected: ${user.accounts.length}
Active Strategy Parameters: ${user.strategies[0] ? JSON.stringify(user.strategies[0].params) : 'None'}
`;

  const result = streamText({
    model: openai('gpt-4o'),
    system: `You are Mochi, a playful, friendly, yet razor-sharp trading AI assistant built directly into Floqex. 
You analyze trades, explain market dynamics, and suggest strategy parameter changes. 
Keep your responses short, punchy, and conversational. 
If the user asks for something outside of trading or platform help, gently steer them back.
Context about the user:
${contextStr}
`,
    messages,
    tools: {
      updateRiskParams: tool({
        description: 'Update the user\'s active strategy parameters (e.g. risk percent, max loss, target R).',
        parameters: z.object({
          riskPct: z.number().optional().describe('Risk percentage per trade (e.g., 0.5 for 0.5%).'),
          maxLoss: z.number().optional().describe('Max total loss per day in R (e.g., 3 for 3R).'),
          targetR: z.number().optional().describe('Target reward multiple (e.g., 2 for 2R).'),
        }),
        execute: async ({ riskPct, maxLoss, targetR }) => {
          if (!user.strategies[0]) return { success: false, message: 'No active strategy found.' };
          
          const currentParams = user.strategies[0].params as any;
          const newParams = { ...currentParams };
          if (riskPct !== undefined) newParams.riskPct = riskPct;
          if (maxLoss !== undefined) newParams.maxLoss = maxLoss;
          if (targetR !== undefined) newParams.targetR = targetR;

          await prisma.strategy.update({
            where: { id: user.strategies[0].id },
            data: { params: newParams },
          });

          return { success: true, message: 'Parameters updated successfully in the database.', updatedParams: newParams };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
