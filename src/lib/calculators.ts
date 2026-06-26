// Pure, dependency-free calculation engine behind the Calculators tab.
//
// Every function here is a deterministic pure function so it can be unit tested
// and reused on the server or client. UI components own formatting and state;
// this module owns the math. Inputs are validated defensively so a half-typed
// form never throws (NaN / Infinity collapse to safe zeros rather than crashing
// a render).

export type Direction = "LONG" | "SHORT";

const isFiniteNum = (n: number): boolean => typeof n === "number" && Number.isFinite(n);

/** Coerce to a finite number, falling back to `fallback` for NaN/Infinity. */
export function safe(n: number, fallback = 0): number {
  return isFiniteNum(n) ? n : fallback;
}

/** Clamp `n` into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// ============================================================
// Position sizing & risk
// ============================================================

export type PositionSizeInput = {
  /** Account equity in the quote currency. */
  balance: number;
  /** Percentage of the account risked on this trade (e.g. 1 = 1%). */
  riskPct: number;
  /** Planned entry price. */
  entry: number;
  /** Protective stop price. */
  stop: number;
  /** Contract / lot multiplier (units per "1 unit", e.g. futures point value). */
  contractMultiplier?: number;
};

export type PositionSizeResult = {
  /** Cash the trade is allowed to lose if the stop is hit. */
  riskAmount: number;
  /** Price distance between entry and stop. */
  stopDistance: number;
  /** Risk per single unit (stop distance x multiplier). */
  riskPerUnit: number;
  /** Position size in units / contracts (floored to a tradable whole unit). */
  units: number;
  /** Fractional size before flooring (useful for FX / crypto). */
  rawUnits: number;
  /** Total notional exposure (units x entry x multiplier). */
  notional: number;
  /** Notional as a multiple of account equity (effective leverage). */
  leverage: number;
};

/**
 * Risk-based position sizing. Answers "how big can this position be so that a
 * stop-out costs exactly `riskPct` of the account?".
 */
export function positionSize(input: PositionSizeInput): PositionSizeResult {
  const balance = safe(input.balance);
  const riskPct = safe(input.riskPct);
  const entry = safe(input.entry);
  const stop = safe(input.stop);
  const mult = safe(input.contractMultiplier ?? 1, 1) || 1;

  const riskAmount = balance * (riskPct / 100);
  const stopDistance = Math.abs(entry - stop);
  const riskPerUnit = stopDistance * mult;
  const rawUnits = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;
  const units = Math.floor(rawUnits);
  const notional = rawUnits * entry * mult;
  const leverage = balance > 0 ? notional / balance : 0;

  return {
    riskAmount: safe(riskAmount),
    stopDistance: safe(stopDistance),
    riskPerUnit: safe(riskPerUnit),
    units: safe(units),
    rawUnits: safe(rawUnits),
    notional: safe(notional),
    leverage: safe(leverage),
  };
}

export type RiskRewardInput = {
  entry: number;
  stop: number;
  target: number;
  direction: Direction;
};

export type RiskRewardResult = {
  risk: number;
  reward: number;
  /** Reward-to-risk multiple (R). */
  ratio: number;
  /** Win rate needed just to break even at this R. */
  breakevenWinRate: number;
  /** True when the target sits on the profitable side of entry for the direction. */
  valid: boolean;
};

/** Reward-to-risk for a planned trade, plus the break-even hit rate it implies. */
export function riskReward(input: RiskRewardInput): RiskRewardResult {
  const entry = safe(input.entry);
  const stop = safe(input.stop);
  const target = safe(input.target);
  const long = input.direction === "LONG";

  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  const ratio = risk > 0 ? reward / risk : 0;
  // Break-even win rate p satisfies p*reward = (1-p)*risk  ->  p = risk/(risk+reward).
  const breakevenWinRate = risk + reward > 0 ? (risk / (risk + reward)) * 100 : 0;
  const valid = long ? target > entry && stop < entry : target < entry && stop > entry;

  return {
    risk: safe(risk),
    reward: safe(reward),
    ratio: safe(ratio),
    breakevenWinRate: safe(breakevenWinRate),
    valid,
  };
}

/** Break-even win rate (%) required to be profitable at a given reward:risk. */
export function requiredWinRate(rr: number): number {
  const r = safe(rr);
  return r > 0 ? (1 / (1 + r)) * 100 : 100;
}

export type StopTargetInput = {
  entry: number;
  /** Average True Range in price terms. */
  atr: number;
  /** Stop placed this many ATRs away from entry. */
  atrMultiple: number;
  /** Reward:risk used to project the target. */
  rr: number;
  direction: Direction;
};

export type StopTargetResult = {
  stop: number;
  target: number;
  stopDistance: number;
  targetDistance: number;
};

/** Volatility-based stop and target placement from ATR. */
export function stopTargetFromAtr(input: StopTargetInput): StopTargetResult {
  const entry = safe(input.entry);
  const atr = Math.abs(safe(input.atr));
  const atrMultiple = Math.abs(safe(input.atrMultiple));
  const rr = Math.abs(safe(input.rr));
  const long = input.direction === "LONG";

  const stopDistance = atr * atrMultiple;
  const targetDistance = stopDistance * rr;
  const stop = long ? entry - stopDistance : entry + stopDistance;
  const target = long ? entry + targetDistance : entry - targetDistance;

  return {
    stop: safe(stop),
    target: safe(target),
    stopDistance: safe(stopDistance),
    targetDistance: safe(targetDistance),
  };
}

// ============================================================
// Leverage, margin & P&L
// ============================================================

export type LeverageInput = {
  /** Equity committed as collateral. */
  equity: number;
  /** Entry price of the instrument. */
  entry: number;
  /** Position size in units / contracts. */
  units: number;
  /** Account leverage (e.g. 10 = 10x). */
  leverage: number;
  /** Maintenance margin requirement as a percentage of notional. */
  maintenanceMarginPct: number;
  direction: Direction;
};

export type LeverageResult = {
  notional: number;
  marginRequired: number;
  /** Price at which maintenance margin is breached. */
  liquidationPrice: number;
  /** Percentage move from entry to liquidation. */
  liquidationDistancePct: number;
};

/** Margin requirement and approximate liquidation price for a leveraged position. */
export function leverageMargin(input: LeverageInput): LeverageResult {
  const entry = safe(input.entry);
  const units = Math.abs(safe(input.units));
  const leverage = safe(input.leverage) || 1;
  const mmPct = safe(input.maintenanceMarginPct) / 100;
  const long = input.direction === "LONG";

  const notional = units * entry;
  const marginRequired = leverage > 0 ? notional / leverage : 0;
  // Liquidation when equity erodes to maintenance margin. Using initial margin as
  // the equity buffer: move = (1/leverage - mm) of entry against the position.
  const buffer = 1 / leverage - mmPct;
  const move = entry * buffer;
  const liquidationPrice = long ? entry - move : entry + move;
  const liquidationDistancePct = entry > 0 ? Math.abs(move / entry) * 100 : 0;

  return {
    notional: safe(notional),
    marginRequired: safe(marginRequired),
    liquidationPrice: safe(Math.max(0, liquidationPrice)),
    liquidationDistancePct: safe(liquidationDistancePct),
  };
}

export type PnlInput = {
  entry: number;
  exit: number;
  units: number;
  direction: Direction;
  contractMultiplier?: number;
  /** Round-trip fee as a percentage of notional (entry + exit combined). */
  feePct?: number;
  /** Optional stop, used to express the result as an R multiple. */
  stop?: number;
};

export type PnlResult = {
  grossPnl: number;
  fees: number;
  netPnl: number;
  /** Return on the position notional, in percent. */
  returnPct: number;
  /** Result in R multiples when a stop is provided. */
  rMultiple: number | null;
};

/** Realised profit and loss for a closed position, net of fees. */
export function profitLoss(input: PnlInput): PnlResult {
  const entry = safe(input.entry);
  const exit = safe(input.exit);
  const units = Math.abs(safe(input.units));
  const mult = safe(input.contractMultiplier ?? 1, 1) || 1;
  const feePct = safe(input.feePct ?? 0) / 100;
  const long = input.direction === "LONG";

  const move = long ? exit - entry : entry - exit;
  const grossPnl = move * units * mult;
  const entryNotional = entry * units * mult;
  const exitNotional = exit * units * mult;
  const fees = (entryNotional + exitNotional) * feePct;
  const netPnl = grossPnl - fees;
  const returnPct = entryNotional > 0 ? (netPnl / entryNotional) * 100 : 0;

  let rMultiple: number | null = null;
  if (input.stop != null) {
    const riskPerUnit = Math.abs(entry - safe(input.stop)) * mult;
    const riskAmount = riskPerUnit * units;
    rMultiple = riskAmount > 0 ? netPnl / riskAmount : null;
  }

  return {
    grossPnl: safe(grossPnl),
    fees: safe(fees),
    netPnl: safe(netPnl),
    returnPct: safe(returnPct),
    rMultiple: rMultiple == null ? null : safe(rMultiple),
  };
}

export type BreakevenResult = {
  /** Price move (in price terms) needed to cover round-trip fees. */
  breakevenMove: number;
  /** Break-even price for the given direction. */
  breakevenPrice: number;
  /** Break-even move as a percentage of entry. */
  breakevenPct: number;
};

/** The price the position must reach to cover round-trip costs. */
export function breakeven(entry: number, feePctRoundTrip: number, direction: Direction): BreakevenResult {
  const e = safe(entry);
  const feeFraction = safe(feePctRoundTrip) / 100;
  const breakevenMove = e * feeFraction;
  const breakevenPrice = direction === "LONG" ? e + breakevenMove : e - breakevenMove;
  return {
    breakevenMove: safe(breakevenMove),
    breakevenPrice: safe(breakevenPrice),
    breakevenPct: safe(feeFraction * 100),
  };
}

// ============================================================
// Strategy edge
// ============================================================

export type KellyResult = {
  /** Full-Kelly fraction of capital to risk per trade (0-1). */
  fraction: number;
  /** Half-Kelly, the common practical compromise. */
  halfKelly: number;
  /** Quarter-Kelly, conservative. */
  quarterKelly: number;
  /** Expected geometric growth rate per trade at full Kelly. */
  growthRate: number;
  /** Growth-rate curve sampled across fractions for plotting. */
  curve: { fraction: number; growth: number }[];
};

/**
 * Kelly criterion for a binary bet. `winRate` in percent, `payoff` is the
 * reward:risk (b). Negative fractions (no edge) clamp to 0.
 */
export function kelly(winRate: number, payoff: number, samples = 60): KellyResult {
  const p = clamp(safe(winRate) / 100, 0, 1);
  const q = 1 - p;
  const b = Math.max(0, safe(payoff));
  const fractionRaw = b > 0 ? (b * p - q) / b : 0;
  const fraction = clamp(fractionRaw, 0, 1);

  // Expected log-growth per trade for a fraction f: p*ln(1+b*f) + q*ln(1-f).
  const growthAt = (f: number): number => {
    if (f <= 0) return 0;
    if (f >= 1) return -Infinity;
    const g = p * Math.log(1 + b * f) + q * Math.log(1 - f);
    return safe(g, -Infinity);
  };

  const curve: { fraction: number; growth: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const f = i / samples;
    const g = growthAt(f);
    curve.push({ fraction: f, growth: Number.isFinite(g) ? g : 0 });
  }

  return {
    fraction: safe(fraction),
    halfKelly: safe(fraction / 2),
    quarterKelly: safe(fraction / 4),
    growthRate: safe(growthAt(fraction)),
    curve,
  };
}

export type ExpectancyResult = {
  /** Expected value per trade in cash terms. */
  perTrade: number;
  /** Expected value expressed in R (per unit risked). */
  perR: number;
  /** Profit factor: gross wins / gross losses. */
  profitFactor: number;
  /** Edge expressed as a percentage of the amount risked. */
  edgePct: number;
};

/**
 * Trade expectancy from a win rate and average win/loss sizes. `avgWin` and
 * `avgLoss` are positive cash magnitudes.
 */
export function expectancy(winRate: number, avgWin: number, avgLoss: number): ExpectancyResult {
  const p = clamp(safe(winRate) / 100, 0, 1);
  const q = 1 - p;
  const w = Math.abs(safe(avgWin));
  const l = Math.abs(safe(avgLoss));

  const perTrade = p * w - q * l;
  const perR = l > 0 ? perTrade / l : 0;
  const grossWins = p * w;
  const grossLosses = q * l;
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  const edgePct = l > 0 ? (perTrade / l) * 100 : 0;

  return {
    perTrade: safe(perTrade),
    perR: safe(perR),
    profitFactor: profitFactor === Infinity ? Infinity : safe(profitFactor),
    edgePct: safe(edgePct),
  };
}

// ============================================================
// Projections
// ============================================================

export type CompoundingInput = {
  start: number;
  /** Return per period in percent. */
  ratePct: number;
  /** Number of compounding periods. */
  periods: number;
  /** Optional fixed contribution added at the end of each period. */
  contribution?: number;
};

export type CompoundingResult = {
  finalBalance: number;
  totalContributed: number;
  totalGrowth: number;
  /** Per-period balances including the starting point (length = periods + 1). */
  series: number[];
};

/** Period-by-period compounding with optional recurring contributions. */
export function compounding(input: CompoundingInput): CompoundingResult {
  const start = safe(input.start);
  const rate = safe(input.ratePct) / 100;
  const periods = Math.max(0, Math.floor(safe(input.periods)));
  const contribution = safe(input.contribution ?? 0);

  const series: number[] = [start];
  let balance = start;
  let contributed = start;
  for (let i = 0; i < periods; i++) {
    balance = balance * (1 + rate) + contribution;
    contributed += contribution;
    series.push(balance);
  }

  return {
    finalBalance: safe(balance),
    totalContributed: safe(contributed),
    totalGrowth: safe(balance - contributed),
    series,
  };
}

/** Gain (%) required to recover from a given drawdown (%). */
export function drawdownRecovery(drawdownPct: number): number {
  const dd = clamp(safe(drawdownPct) / 100, 0, 0.999999);
  return safe((dd / (1 - dd)) * 100);
}

// ============================================================
// Monte Carlo simulation
// ============================================================

/** Deterministic, seedable PRNG (mulberry32) so simulations are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MonteCarloInput = {
  /** Starting equity. */
  start: number;
  /** Percentage of current equity risked per trade. */
  riskPct: number;
  /** Probability of a winning trade, in percent. */
  winRate: number;
  /** Reward:risk on a win (loss is always -1R). */
  rr: number;
  /** Trades per simulated path. */
  trades: number;
  /** Number of simulated paths. */
  sims: number;
  /** Equity drawdown from peak (%) that counts as ruin. */
  ruinPct: number;
  /** Seed for reproducibility. */
  seed?: number;
};

export type MonteCarloResult = {
  /** Final equity for every path, ascending. */
  finals: number[];
  /** Percentile final balances. */
  p5: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
  mean: number;
  best: number;
  worst: number;
  /** Share of paths finishing above the starting balance, in percent. */
  probProfit: number;
  /** Share of paths that hit the ruin threshold at any point, in percent. */
  riskOfRuin: number;
  /** Median of each path's maximum drawdown, in percent. */
  medianMaxDrawdown: number;
  /** A handful of representative equity paths for plotting. */
  samplePaths: number[][];
  /** Histogram of final balances. */
  histogram: { x0: number; x1: number; count: number }[];
};

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = clamp(p, 0, 1) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

/**
 * Monte Carlo equity simulation. Each trade risks a fixed fraction of *current*
 * equity (so wins and losses compound), wins pay `rr` x the risk and losses cost
 * 1x. Returns outcome percentiles, probability of profit, risk of ruin, the
 * drawdown distribution, and a few sample paths for visualisation.
 *
 * This is a stochastic estimate, not a guarantee. It assumes trades are
 * independent and the edge is stationary.
 */
export function monteCarlo(input: MonteCarloInput): MonteCarloResult {
  const start = Math.max(1, safe(input.start, 1));
  const riskFrac = clamp(safe(input.riskPct) / 100, 0, 1);
  const p = clamp(safe(input.winRate) / 100, 0, 1);
  const rr = Math.max(0, safe(input.rr));
  const trades = clamp(Math.floor(safe(input.trades)), 1, 5000);
  const sims = clamp(Math.floor(safe(input.sims)), 1, 5000);
  const ruinThreshold = clamp(safe(input.ruinPct) / 100, 0.01, 1);
  const rand = mulberry32(safe(input.seed ?? 1, 1) >>> 0 || 1);

  const finals: number[] = new Array(sims);
  const maxDrawdowns: number[] = new Array(sims);
  let ruinCount = 0;
  let profitCount = 0;
  let sum = 0;

  // Keep up to 24 representative paths (evenly spaced) for the spaghetti chart.
  const maxSamplePaths = Math.min(24, sims);
  const sampleEvery = Math.max(1, Math.floor(sims / maxSamplePaths));
  const samplePaths: number[][] = [];

  for (let s = 0; s < sims; s++) {
    let equity = start;
    let peak = start;
    let maxDd = 0;
    let ruined = false;
    const keepPath = s % sampleEvery === 0 && samplePaths.length < maxSamplePaths;
    const path: number[] = keepPath ? [equity] : [];

    for (let t = 0; t < trades; t++) {
      const risk = equity * riskFrac;
      equity += rand() < p ? risk * rr : -risk;
      if (equity < 0) equity = 0;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? (peak - equity) / peak : 0;
      if (dd > maxDd) maxDd = dd;
      if (!ruined && dd >= ruinThreshold) ruined = true;
      if (keepPath) path.push(equity);
    }

    finals[s] = equity;
    maxDrawdowns[s] = maxDd * 100;
    sum += equity;
    if (ruined) ruinCount++;
    if (equity > start) profitCount++;
    if (keepPath) samplePaths.push(path);
  }

  const sortedFinals = [...finals].sort((a, b) => a - b);
  const sortedDd = [...maxDrawdowns].sort((a, b) => a - b);

  // Build a histogram of final balances (clamped count of bins).
  const bins = clamp(Math.round(Math.sqrt(sims)), 6, 24);
  const lo = sortedFinals[0];
  const hi = sortedFinals[sortedFinals.length - 1];
  const width = hi - lo || 1;
  const histogram: { x0: number; x1: number; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    histogram.push({ x0: lo + (width * i) / bins, x1: lo + (width * (i + 1)) / bins, count: 0 });
  }
  for (const f of sortedFinals) {
    let idx = Math.floor(((f - lo) / width) * bins);
    idx = clamp(idx, 0, bins - 1);
    histogram[idx].count++;
  }

  return {
    finals: sortedFinals,
    p5: percentile(sortedFinals, 0.05),
    p25: percentile(sortedFinals, 0.25),
    median: percentile(sortedFinals, 0.5),
    p75: percentile(sortedFinals, 0.75),
    p95: percentile(sortedFinals, 0.95),
    mean: safe(sum / sims),
    best: hi,
    worst: lo,
    probProfit: safe((profitCount / sims) * 100),
    riskOfRuin: safe((ruinCount / sims) * 100),
    medianMaxDrawdown: percentile(sortedDd, 0.5),
    samplePaths,
    histogram,
  };
}

/**
 * Closed-form risk of ruin for fixed-fractional betting, as a sanity check
 * against the simulation. Returns a probability in percent. Uses the classic
 * gambler's-ruin approximation; when the edge is non-positive, ruin is certain.
 */
export function riskOfRuinAnalytic(winRate: number, rr: number, riskUnits: number): number {
  const p = clamp(safe(winRate) / 100, 0, 1);
  const b = Math.max(0, safe(rr));
  const edge = p * b - (1 - p); // expected R per trade
  if (edge <= 0) return 100;
  const units = Math.max(1, safe(riskUnits, 1));
  // A = (1 - edgePerUnit) / (1 + edgePerUnit), ruin ~= A^units.
  const a = b > 0 ? (1 - p + (1 - p) / b) / (p + p / b) : 1;
  const ratio = clamp(a, 0, 1);
  return safe(Math.pow(ratio, units) * 100);
}
