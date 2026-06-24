import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRisk } from '../risk-engine';
import { prisma } from '@/lib/db';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    account: {
      findUnique: vi.fn(),
    },
    dailySummary: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Risk Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseSignal = {
    direction: 'LONG' as const,
    entryPrice: 100,
    stopPrice: 90,
    targetPrice: 120,
    reason: 'test',
  };

  it('rejects trade if account is not found', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue(null);
    const result = await validateRisk('bot1', 'acc1', baseSignal);
    expect(result).toEqual({ passed: false, reason: 'ACCOUNT_NOT_FOUND' });
  });

  it('rejects live trade if plan does not support live trading', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue({
      id: 'acc1',
      mode: 'LIVE',
      user: { plan: 'FREE' }
    } as any);
    const result = await validateRisk('bot1', 'acc1', baseSignal);
    expect(result).toEqual({ passed: false, reason: 'LIVE_TRADING_NOT_ALLOWED_ON_PLAN' });
  });

  it('rejects trade if global hard stop balance limit is breached (<$100)', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue({
      id: 'acc1',
      mode: 'PAPER',
      balance: 99,
      user: { plan: 'TRADER' }
    } as any);
    vi.mocked(prisma.dailySummary.findFirst).mockResolvedValue(null);

    const result = await validateRisk('bot1', 'acc1', baseSignal);
    expect(result).toEqual({ passed: false, reason: 'GLOBAL_HARD_STOP_BALANCE_TOO_LOW' });
  });

  it('rejects trade if daily drawdown limit is breached', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue({
      id: 'acc1',
      mode: 'PAPER',
      balance: 10000,
      maxDailyDrawdown: 50,
      user: { plan: 'TRADER' }
    } as any);
    
    vi.mocked(prisma.dailySummary.findFirst).mockResolvedValue({
      netPnl: { toNumber: () => -51 }
    } as any);

    const result = await validateRisk('bot1', 'acc1', baseSignal);
    expect(result).toEqual({ passed: false, reason: 'CIRCUIT_BREAKER_TRIPPED' });
  });

  it('passes risk and calculates correct position size', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue({
      id: 'acc1',
      mode: 'PAPER',
      balance: 10000,
      maxDailyDrawdown: 500,
      user: { plan: 'TRADER' }
    } as any);
    vi.mocked(prisma.dailySummary.findFirst).mockResolvedValue(null);

    const result = await validateRisk('bot1', 'acc1', baseSignal);
    
    // Balance 10000, 1% risk = $100
    // Entry 100, Stop 90 => $10 price risk per unit
    // $100 / $10 = 10 units
    expect(result.passed).toBe(true);
    expect(result.sizeUnits).toBe(10);
    expect(result.riskPct).toBe(0.01);
  });
});
