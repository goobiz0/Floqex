/**
 * Deterministic sample data for the dashboard product pages.
 * Replace with real queries (see prisma/schema.prisma) once the bot is live.
 */

export type MockTrade = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  instrument: "Gold" | "NQ" | "ES";
  direction: "LONG" | "SHORT";
  session: "ASIA" | "NY";
  entry: number;
  exit: number;
  rMultiple: number;
  netPnl: number;
  win: boolean;
};

const INSTRUMENTS = ["Gold", "NQ", "ES"] as const;
const PRICE: Record<(typeof INSTRUMENTS)[number], number> = {
  Gold: 2420,
  NQ: 19800,
  ES: 5560,
};

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RISK_PER_TRADE = 100; // $ risked per trade in the sample

/** Generates ~45 trades across the trailing ~40 days, anchored to a fixed date. */
function generate(): MockTrade[] {
  const rng = mulberry32(20260620);
  const trades: MockTrade[] = [];
  const anchor = new Date("2026-06-19T00:00:00Z");
  let id = 0;

  for (let dayBack = 39; dayBack >= 0; dayBack--) {
    const d = new Date(anchor);
    d.setUTCDate(anchor.getUTCDate() - dayBack);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue; // weekdays only
    const tradesToday = Math.floor(rng() * 3); // 0..2
    for (let i = 0; i < tradesToday; i++) {
      const instrument = INSTRUMENTS[Math.floor(rng() * INSTRUMENTS.length)];
      const session: "ASIA" | "NY" = instrument === "Gold" && rng() > 0.6 ? "ASIA" : "NY";
      const direction: "LONG" | "SHORT" = rng() > 0.45 ? "LONG" : "SHORT";
      // ~57% win rate, winners +2R, losers -1R
      const win = rng() < 0.57;
      const r = win ? 2 : -1;
      const netPnl = Math.round(r * RISK_PER_TRADE - (win ? 0 : 0) + (rng() - 0.5) * 14);
      const base = PRICE[instrument];
      const entry = +(base * (1 + (rng() - 0.5) * 0.01)).toFixed(2);
      const exit = +(entry * (1 + (direction === "LONG" ? r : -r) * 0.0012)).toFixed(2);
      const hh = session === "ASIA" ? 9 + Math.floor(rng() * 3) : 9 + Math.floor(rng() * 6);
      const mm = Math.floor(rng() * 60);
      trades.push({
        id: `T${(++id).toString().padStart(3, "0")}`,
        date: d.toISOString().slice(0, 10),
        time: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        instrument,
        direction,
        session,
        entry,
        exit,
        rMultiple: +(r + (rng() - 0.5) * 0.2).toFixed(2),
        netPnl,
        win,
      });
    }
  }
  return trades;
}

export const TRADES: MockTrade[] = generate();

export function dailyPnl(): Map<string, { pnl: number; count: number }> {
  const map = new Map<string, { pnl: number; count: number }>();
  for (const t of TRADES) {
    const cur = map.get(t.date) ?? { pnl: 0, count: 0 };
    cur.pnl += t.netPnl;
    cur.count += 1;
    map.set(t.date, cur);
  }
  return map;
}

export function summaryMetrics() {
  const wins = TRADES.filter((t) => t.win);
  const losses = TRADES.filter((t) => !t.win);
  const grossWin = wins.reduce((s, t) => s + t.netPnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));
  const total = TRADES.reduce((s, t) => s + t.netPnl, 0);
  return {
    total,
    count: TRADES.length,
    winRate: (wins.length / TRADES.length) * 100,
    profitFactor: grossLoss === 0 ? grossWin : grossWin / grossLoss,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
  };
}

export function byInstrument() {
  const out: Record<string, number> = { Gold: 0, NQ: 0, ES: 0 };
  for (const t of TRADES) out[t.instrument] += t.netPnl;
  return out;
}

export function bySession() {
  const out = { ASIA: 0, NY: 0 };
  for (const t of TRADES) out[t.session] += t.netPnl;
  return out;
}

export function byWeekday() {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const out: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
  for (const t of TRADES) {
    const idx = new Date(t.date + "T00:00:00Z").getUTCDay() - 1;
    if (idx >= 0 && idx < 5) out[names[idx]] += t.netPnl;
  }
  return out;
}

export function rDistribution() {
  // buckets of R multiple
  const buckets = [
    { label: "-1R", min: -1.5, max: -0.5, count: 0 },
    { label: "0R", min: -0.5, max: 0.5, count: 0 },
    { label: "+1R", min: 0.5, max: 1.5, count: 0 },
    { label: "+2R", min: 1.5, max: 2.5, count: 0 },
  ];
  for (const t of TRADES) {
    const b = buckets.find((x) => t.rMultiple >= x.min && t.rMultiple < x.max);
    if (b) b.count += 1;
  }
  return buckets;
}
