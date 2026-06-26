// Pure technical-indicator math. Kept dependency-free and side-effect free so it
// can be unit tested and reused by the live engine (to build the evaluation
// context for custom strategies) and by the backtest/preview path. Every helper
// returns `null` rather than throwing when there is not enough data, and the
// evaluation layer treats a null indicator as "condition not met".

export type Bar = { open?: number; high: number; low: number; close: number; volume?: number };

/** Simple moving average of the last `period` values. Null if too few. */
export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

/** Exponential moving average seeded with an SMA. Null if too few values. */
export function ema(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  const k = 2 / (period + 1);
  // Seed with the SMA of the first `period` values, then walk forward.
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }
  return prev;
}

/** Wilder's RSI over `period`. Returns 0-100, or null if too few values. */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  // Initial average gain/loss over the first `period` deltas.
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  // Wilder smoothing across the rest of the series.
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const up = diff > 0 ? diff : 0;
    const down = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + up) / period;
    avgLoss = (avgLoss * (period - 1) + down) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Average True Range over `period`. Null if too few bars. */
export function atr(bars: Bar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i];
    const prevClose = bars[i - 1].close;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prevClose),
      Math.abs(cur.low - prevClose),
    );
    trs.push(tr);
  }
  // Wilder-smoothed ATR.
  let prev = 0;
  for (let i = 0; i < period; i++) prev += trs[i];
  prev /= period;
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period;
  }
  return prev;
}

/**
 * The full evaluation context handed to custom strategies, both the rule builder
 * and the code sandbox. Numeric fields are the live indicator values; any value
 * that cannot be computed yet is `null` and treated as "not met".
 */
export type IndicatorContext = {
  price: number;
  prevClose: number | null;
  changePct: number | null;
  dayHigh: number;
  dayLow: number;
  /** Where price sits inside today's range, 0 (low) to 100 (high). */
  rangePosition: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  /** MACD line (ema12 - ema26). */
  macd: number | null;
  rsi14: number | null;
  atr14: number | null;
  /** ATR as a percentage of price. */
  atrPct: number | null;
  volume: number | null;
};

export type IndicatorQuote = {
  price: number;
  dayHigh: number;
  dayLow: number;
  prevClose?: number | null;
  volume?: number | null;
};

const pct = (a: number, b: number): number | null => (b > 0 ? (a / b) * 100 : null);

/**
 * Build the indicator context from historical daily bars plus the live quote.
 * `bars` should be oldest-first daily closes; the live price is appended for the
 * moving-average style indicators so they reflect the current tick.
 */
export function computeIndicatorContext(bars: Bar[], quote: IndicatorQuote): IndicatorContext {
  const closes = bars.map((b) => b.close).filter((c) => Number.isFinite(c));
  // Append the live price so MAs/RSI include the current tick.
  const series = [...closes, quote.price];
  const barsWithLive: Bar[] = [...bars, { high: quote.dayHigh, low: quote.dayLow, close: quote.price }];

  const ema12 = ema(series, 12);
  const ema26 = ema(series, 26);
  const range = quote.dayHigh - quote.dayLow;
  const prevClose = quote.prevClose ?? (closes.length ? closes[closes.length - 1] : null);
  const atr14 = atr(barsWithLive, 14);

  return {
    price: quote.price,
    prevClose,
    changePct: prevClose != null && prevClose > 0 ? ((quote.price - prevClose) / prevClose) * 100 : null,
    dayHigh: quote.dayHigh,
    dayLow: quote.dayLow,
    rangePosition: range > 0 ? ((quote.price - quote.dayLow) / range) * 100 : null,
    sma20: sma(series, 20),
    sma50: sma(series, 50),
    sma200: sma(series, 200),
    ema12,
    ema26,
    macd: ema12 != null && ema26 != null ? ema12 - ema26 : null,
    rsi14: rsi(series, 14),
    atr14,
    atrPct: atr14 != null ? pct(atr14, quote.price) : null,
    volume: quote.volume ?? null,
  };
}
