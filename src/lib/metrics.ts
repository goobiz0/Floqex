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
