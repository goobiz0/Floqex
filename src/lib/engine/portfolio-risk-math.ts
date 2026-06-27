// Pure portfolio-risk math, deliberately free of any prisma/network import so it
// stays trivially unit-testable. The data-backed aggregation in
// `portfolio-risk.ts` builds on these and the live guard and UI both render
// breaches from the same function, so they never disagree.

const safe = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback);

/** Pearson correlation of two equal-length series. 0 when either is flat. */
export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i];
    sb += b[i];
  }
  const ma = sa / n;
  const mb = sb / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  if (va === 0 || vb === 0) return 0;
  return safe(cov / Math.sqrt(va * vb));
}

/** Correlation matrix for a set of equal-length return series. */
export function correlationMatrix(series: number[][]): number[][] {
  return series.map((a) => series.map((b) => Math.round(pearson(a, b) * 100) / 100));
}

export type ConcentrationSlice = { key: string; notional: number; pct: number };

/** Group notional exposure by key and express each slice as a share of the whole. */
export function concentration(items: { key: string; notional: number }[]): ConcentrationSlice[] {
  const totals = new Map<string, number>();
  for (const it of items) totals.set(it.key, (totals.get(it.key) ?? 0) + it.notional);
  const grand = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return [...totals.entries()]
    .map(([key, notional]) => ({ key, notional: Math.round(notional), pct: Math.round((notional / grand) * 1000) / 10 }))
    .sort((a, b) => b.notional - a.notional);
}

export type PortfolioPolicy = { maxPortfolioDrawdown: number | null; tradingHalted: boolean; concentrationCapPct?: number };
export type PortfolioBreach = { kind: "HALTED" | "DRAWDOWN" | "CONCENTRATION"; severity: "warn" | "critical"; message: string };

/**
 * Evaluate the portfolio against its policy. Pure: given the numbers, it returns
 * the breaches.
 */
export function evaluateBreaches(
  input: { todayNetPnl: number; concentration: ConcentrationSlice[] },
  policy: PortfolioPolicy,
): PortfolioBreach[] {
  const breaches: PortfolioBreach[] = [];
  if (policy.tradingHalted) {
    breaches.push({ kind: "HALTED", severity: "critical", message: "Trading is halted across all bots." });
  }
  if (policy.maxPortfolioDrawdown != null && input.todayNetPnl < -Math.abs(policy.maxPortfolioDrawdown)) {
    breaches.push({
      kind: "DRAWDOWN",
      severity: "critical",
      message: `Portfolio is down ${fmt(input.todayNetPnl)} today, past the ${fmt(-Math.abs(policy.maxPortfolioDrawdown))} limit.`,
    });
  }
  const cap = policy.concentrationCapPct ?? 60;
  const top = input.concentration[0];
  if (top && top.pct > cap) {
    breaches.push({
      kind: "CONCENTRATION",
      severity: "warn",
      message: `${top.pct}% of exposure is in ${top.key}, above the ${cap}% comfort cap.`,
    });
  }
  return breaches;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
