/**
 * Trade analytics — the single source of truth for every derived metric shown
 * in the dashboard. Pure functions over real, serialized trade rows (no Prisma
 * Decimal objects). The single source of truth now that the dashboard reads the
 * database directly (the former mock-data generator has been removed).
 *
 * Field mapping (from prisma/schema.prisma `Trade`):
 *   win        := netPnl > 0            (a trade is a win when net P&L is positive)
 *   pnl        := netPnl                (net of commission; grossPnl/commission kept separately)
 *   r          := rMultiple             (realised R; ~ +2 winners, -1 losers for ORB)
 *   when       := openedAt / closedAt   (ISO strings)
 * Equity/drawdown derive from `DailySummary.endBalance` (the daily mark), not
 * from accumulating trade P&L, so intraday open positions never distort history.
 */

export type TradeRow = {
  id: string;
  instrument: string;
  direction: "LONG" | "SHORT";
  session: "ASIA" | "NY";
  status: "OPEN" | "CLOSED";
  entryPrice: number;
  exitPrice: number | null;
  stopPrice: number;
  targetPrice: number;
  sizeUnits: number;
  netPnl: number | null;
  grossPnl: number | null;
  rMultiple: number | null;
  openedAt: string;
  closedAt: string | null;
  narrative: string | null;
  screenshotUrl: string | null;
};

export type DailyRow = {
  date: string; // ISO date (YYYY-MM-DD)
  netPnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  startBalance: number;
  endBalance: number;
};

export type EquityPoint = { date: string; equity: number };

const isClosed = (t: TradeRow) => t.status === "CLOSED";
const isWin = (t: TradeRow) => (t.netPnl ?? 0) > 0;
const isLoss = (t: TradeRow) => (t.netPnl ?? 0) < 0;

export type Summary = {
  total: number;
  count: number;
  winRate: number; // %
  profitFactor: number; // gross profit / gross loss
  avgWin: number;
  avgLoss: number; // positive magnitude
  expectancy: number; // mean R per trade
};

export function summaryMetrics(trades: TradeRow[]): Summary {
  const closed = trades.filter(isClosed);
  const wins = closed.filter(isWin);
  const losses = closed.filter(isLoss);
  const grossWin = wins.reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.netPnl ?? 0), 0));
  const total = closed.reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const rSum = closed.reduce((s, t) => s + (t.rMultiple ?? 0), 0);
  return {
    total,
    count: closed.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    expectancy: closed.length ? rSum / closed.length : 0,
  };
}

/** Daily equity curve from the per-day end balance (ascending by date). */
export function equitySeries(summaries: DailyRow[]): EquityPoint[] {
  return [...summaries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: s.date, equity: s.endBalance }));
}

/**
 * Underwater (drawdown) series: percent below the running peak at each point.
 * Values are <= 0 (0 at a new high, negative while underwater). Powers the
 * drawdown-curve widget.
 */
export function drawdownSeries(series: EquityPoint[]): { date: string; ddPct: number }[] {
  let peak = -Infinity;
  return series.map((point) => {
    peak = Math.max(peak, point.equity);
    const ddPct = peak > 0 ? ((point.equity - peak) / peak) * 100 : 0;
    return { date: point.date, ddPct };
  });
}

/**
 * Open-position exposure grouped by a key (instrument or direction). Notional is
 * |entryPrice * sizeUnits| per open trade. Returns descending shares of the
 * total so the risk-exposure widget shows where real capital is committed.
 */
export function openExposure(
  openTrades: TradeRow[],
  groupBy: "asset" | "direction",
): { label: string; notional: number; pct: number }[] {
  const totals = new Map<string, number>();
  for (const t of openTrades) {
    if (t.status !== "OPEN") continue;
    const notional = Math.abs(t.entryPrice * t.sizeUnits);
    if (!Number.isFinite(notional) || notional <= 0) continue;
    const key = groupBy === "direction" ? t.direction : t.instrument;
    totals.set(key, (totals.get(key) ?? 0) + notional);
  }
  const grand = [...totals.values()].reduce((s, v) => s + v, 0);
  return [...totals.entries()]
    .map(([label, notional]) => ({
      label,
      notional,
      pct: grand > 0 ? (notional / grand) * 100 : 0,
    }))
    .sort((a, b) => b.notional - a.notional);
}

/** Max peak-to-trough drawdown over an equity series, as amount and percent. */
export function maxDrawdown(series: EquityPoint[]): { amount: number; pct: number } {
  let peak = -Infinity;
  let amount = 0;
  let pct = 0;
  for (const point of series) {
    peak = Math.max(peak, point.equity);
    const dd = peak - point.equity;
    if (dd > amount) {
      amount = dd;
      pct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }
  return { amount, pct };
}

/** Net P&L (and trade count) per calendar day, keyed by ISO date. */
export function dailyPnl(summaries: DailyRow[]): Map<string, { pnl: number; count: number }> {
  const map = new Map<string, { pnl: number; count: number }>();
  for (const s of summaries) map.set(s.date, { pnl: s.netPnl, count: s.tradeCount });
  return map;
}

export function byInstrument(trades: TradeRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of trades.filter(isClosed)) {
    out[t.instrument] = (out[t.instrument] ?? 0) + (t.netPnl ?? 0);
  }
  return out;
}

export function bySession(trades: TradeRow[]): Record<"ASIA" | "NY", number> {
  const out = { ASIA: 0, NY: 0 };
  for (const t of trades.filter(isClosed)) out[t.session] += t.netPnl ?? 0;
  return out;
}

export function byWeekday(trades: TradeRow[]): Record<string, number> {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const out: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
  for (const t of trades.filter(isClosed)) {
    const idx = new Date(t.openedAt).getUTCDay() - 1; // Mon=0
    if (idx >= 0 && idx < 5) out[names[idx]] += t.netPnl ?? 0;
  }
  return out;
}

/** Rolling win-rate (%) over a trailing window. Expects chronological order. */
export function rollingWinRate(trades: TradeRow[], window = 10): number[] {
  const closed = trades.filter(isClosed);
  const out: number[] = [];
  for (let i = 0; i < closed.length; i++) {
    const slice = closed.slice(Math.max(0, i - window + 1), i + 1);
    const wins = slice.filter(isWin).length;
    out.push((wins / slice.length) * 100);
  }
  return out;
}

/** Gross profit (sum of winners) and gross loss (positive magnitude of losers). */
export function grossProfitLoss(trades: TradeRow[]): { grossWin: number; grossLoss: number } {
  const closed = trades.filter(isClosed);
  const grossWin = closed.filter(isWin).reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const grossLoss = Math.abs(closed.filter(isLoss).reduce((s, t) => s + (t.netPnl ?? 0), 0));
  return { grossWin, grossLoss };
}

/**
 * Drawdown from the running peak to the latest equity point ("how far underwater
 * are we right now"), as amount and percent. 0 when at a fresh high.
 */
export function currentDrawdown(series: EquityPoint[]): { amount: number; pct: number } {
  if (series.length === 0) return { amount: 0, pct: 0 };
  let peak = -Infinity;
  for (const point of series) peak = Math.max(peak, point.equity);
  const last = series[series.length - 1].equity;
  const amount = Math.max(0, peak - last);
  const pct = peak > 0 ? (amount / peak) * 100 : 0;
  return { amount, pct };
}

export type StreakStats = {
  current: number; // length of the streak ending at the most recent trade
  currentType: "WIN" | "LOSS" | null;
  longestWin: number;
  longestLoss: number;
};

/**
 * Win/loss streaks over closed trades. Expects `trades` newest-first (the
 * dashboard/query order) and walks them chronologically. Break-even trades
 * (netPnl === 0) reset the current run without counting toward either side.
 */
export function streaks(trades: TradeRow[]): StreakStats {
  const chrono = trades.filter(isClosed).slice().reverse();
  let longestWin = 0;
  let longestLoss = 0;
  let runType: "WIN" | "LOSS" | null = null;
  let runLen = 0;
  for (const t of chrono) {
    const type: "WIN" | "LOSS" | null = isWin(t) ? "WIN" : isLoss(t) ? "LOSS" : null;
    if (type === null) {
      runType = null;
      runLen = 0;
      continue;
    }
    if (type === runType) runLen += 1;
    else {
      runType = type;
      runLen = 1;
    }
    if (type === "WIN") longestWin = Math.max(longestWin, runLen);
    else longestLoss = Math.max(longestLoss, runLen);
  }
  return { current: runLen, currentType: runType, longestWin, longestLoss };
}

export function rDistribution(trades: TradeRow[]): { label: string; count: number }[] {
  const buckets = [
    { label: "≤ -0.5R", min: -Infinity, max: -0.5, count: 0 },
    { label: "-0.5 to +0.5R", min: -0.5, max: 0.5, count: 0 },
    { label: "+0.5 to +1.5R", min: 0.5, max: 1.5, count: 0 },
    { label: "≥ +1.5R", min: 1.5, max: Infinity, count: 0 },
  ];
  for (const t of trades.filter(isClosed)) {
    const r = t.rMultiple ?? 0;
    const b = buckets.find((x) => r >= x.min && r < x.max);
    if (b) b.count += 1;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

// ───────────────────────── Execution quality ────────────────────────────────
// Did the bot fill what it intended, how fast, and did it stay up? Pure over
// real fills and heartbeats so the Analytics surface never fabricates numbers.

export type ExecRow = {
  entrySlippageBps: number | null;
  exitSlippageBps: number | null;
  entryLatencyMs: number | null;
};

export type HeartbeatRow = { status: string; lastHeartbeat: string | null };

export type ExecutionQuality = {
  fills: number;
  avgEntrySlippageBps: number;
  medianEntrySlippageBps: number;
  avgExitSlippageBps: number;
  avgLatencyMs: number;
  fillQualityScore: number; // 0-100, higher = tighter fills
  slippageBuckets: { label: string; count: number }[];
  missedSignals: number;
  runningBots: number;
  liveBots: number; // running bots with a fresh heartbeat
  uptimePct: number; // share of running bots beating recently
};

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const HEARTBEAT_FRESH_MS = 5 * 60 * 1000;

/**
 * Aggregate execution quality from filled trades, missed-signal count, and bot
 * heartbeats. Slippage is in basis points (positive = adverse).
 */
export function executionQuality(
  fills: ExecRow[],
  missedSignals: number,
  heartbeats: HeartbeatRow[],
  now: number = Date.now(),
): ExecutionQuality {
  const entry = fills.map((f) => f.entrySlippageBps).filter((v): v is number => v != null);
  const exit = fills.map((f) => f.exitSlippageBps).filter((v): v is number => v != null);
  const latency = fills.map((f) => f.entryLatencyMs).filter((v): v is number => v != null);

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const avgEntry = avg(entry);
  const buckets = [
    { label: "Better fill", min: -Infinity, max: 0, count: 0 },
    { label: "0 to 2 bps", min: 0, max: 2, count: 0 },
    { label: "2 to 5 bps", min: 2, max: 5, count: 0 },
    { label: "5 to 10 bps", min: 5, max: 10, count: 0 },
    { label: "10 bps +", min: 10, max: Infinity, count: 0 },
  ];
  for (const v of entry) {
    const b = buckets.find((x) => v >= x.min && v < x.max);
    if (b) b.count += 1;
  }

  const running = heartbeats.filter((h) => h.status === "RUNNING");
  const live = running.filter((h) => h.lastHeartbeat != null && now - new Date(h.lastHeartbeat).getTime() < HEARTBEAT_FRESH_MS);
  const uptimePct = running.length ? Math.round((live.length / running.length) * 1000) / 10 : 100;

  // Tighter fills score higher: 0 bps adverse -> 100, 20 bps -> 0.
  const fillQualityScore = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, avgEntry) * 5)));

  return {
    fills: fills.length,
    avgEntrySlippageBps: r2(avgEntry),
    medianEntrySlippageBps: r2(median(entry)),
    avgExitSlippageBps: r2(avg(exit)),
    avgLatencyMs: Math.round(avg(latency)),
    fillQualityScore,
    slippageBuckets: buckets.map(({ label, count }) => ({ label, count })),
    missedSignals,
    runningBots: running.length,
    liveBots: live.length,
    uptimePct,
  };
}
