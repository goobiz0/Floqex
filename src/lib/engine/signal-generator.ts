import { MarketData } from './market-data';
import type { Trade } from '@prisma/client';
import { evaluateBuilder, parseDirection, type ConditionGroup } from '../custom-strategy';
import { runTranspiled } from './transpile';
import type { IndicatorContext } from './indicators';

export type Signal = {
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  /** 0-1 confluence score: how many independent indicators agree with the
   *  direction (RSI, MACD, trend, range position). Higher = more conviction. */
  strength?: number;
} | null;

export type ExitSignal = {
  reason: 'TARGET' | 'STOP' | 'TRAIL_UPDATE';
  exitPrice?: number;
  newStopPrice?: number;
} | null;

/** Optional per-bot/instrument context that enables signal de-duplication and a
 *  post-stop-out cooldown. Pure callers (tests, the validation engine) omit it. */
export type SignalGuard = { botId: string; instrument: string; now?: number };

// Suppress an identical signal that re-fires within this window (e.g. between a
// signal and its fill, or right after a same-tick close).
const DEDUP_MS = 30_000;
// After a stop-out, wait this long before re-entering the same instrument —
// prevents the bot from immediately revenge-trading back into a losing setup.
const COOLDOWN_MS = 5 * 60_000;

const lastSignalAt = new Map<string, number>();
const lastStopOutAt = new Map<string, number>();

/** Record a stop-out so the cooldown gate suppresses immediate re-entries.
 *  Called by the worker after a trade closes on its stop. */
export function recordStopOut(botId: string, instrument: string, now: number = Date.now()): void {
  lastStopOutAt.set(`${botId}:${instrument}`, now);
}

/** Returns true if a fresh signal in `direction` is allowed under the dedup and
 *  cooldown rules, recording it when allowed. A no-op (always true) without a guard. */
function allowSignal(guard: SignalGuard | undefined, direction: 'LONG' | 'SHORT'): boolean {
  if (!guard) return true;
  const now = guard.now ?? Date.now();
  const cooldownAt = lastStopOutAt.get(`${guard.botId}:${guard.instrument}`);
  if (cooldownAt != null && now - cooldownAt < COOLDOWN_MS) return false;
  const key = `${guard.botId}:${guard.instrument}:${direction}`;
  const last = lastSignalAt.get(key);
  if (last != null && now - last < DEDUP_MS) return false;
  lastSignalAt.set(key, now);
  return true;
}

/** Score how many independent indicators confirm a direction (0-1). A signal
 *  with RSI + MACD + trend + range all aligned is far stronger than a bare
 *  breakout, and the score rides along on the Signal for ranking/telemetry. */
function scoreStrength(ctx: IndicatorContext, direction: 'LONG' | 'SHORT'): number {
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  let score = 0;
  let max = 0;
  if (ctx.rsi14 != null) {
    max += 1;
    score += direction === 'LONG' ? clamp01((ctx.rsi14 - 40) / 30) : clamp01((60 - ctx.rsi14) / 30);
  }
  if (ctx.macd != null) {
    max += 1;
    if (direction === 'LONG' ? ctx.macd > 0 : ctx.macd < 0) score += 1;
  }
  if (ctx.sma50 != null) {
    max += 1;
    if (direction === 'LONG' ? ctx.price > ctx.sma50 : ctx.price < ctx.sma50) score += 1;
  }
  if (ctx.rangePosition != null) {
    max += 1;
    score += direction === 'LONG' ? clamp01(ctx.rangePosition / 100) : clamp01(1 - ctx.rangePosition / 100);
  }
  return max > 0 ? Math.round((score / max) * 100) / 100 : 0.5;
}

export function evaluateOrbStrategy(params: Record<string, unknown>, marketData: MarketData, openTrade: Trade | null, guard?: SignalGuard): Signal {
  if (openTrade) return null;

  const ctx = contextFromMarketData(marketData);
  const { price, dayHigh, dayLow, sma50 } = marketData;
  const range = dayHigh - dayLow;

  const trendFilterEnabled = params && params.trendFilter === true;
  const isUptrend = sma50 ? price > sma50 : true;
  const isDowntrend = sma50 ? price < sma50 : true;

  // A breakout can fire either way. By default the strategy takes both the upside
  // and downside break; a user who wants a one-sided book can restrict it.
  const dir = parseDirection(params?.direction);
  const allowLong = dir !== "SHORT";
  const allowShort = dir !== "LONG";

  // Real Opening Range Breakout logic:
  // Using real data, if the price pushes very close to or above the day's high, it's a LONG signal.
  const isHighBreakout = price >= dayHigh - (range * 0.05); // within top 5% of day's range
  const isLowBreakout = price <= dayLow + (range * 0.05);   // within bottom 5% of day's range

  // Apply the user's range filters. minRange/maxRange are multiples of a ~1%
  // "normal" daily range: a 0.3x floor skips sessions quieter than 0.3% (flat
  // chop), and a 3x ceiling skips abnormally wide, usually news-driven, days.
  const NORMAL_RANGE = 0.01; // 1% reference daily range
  const dayRangePct = price > 0 ? range / price : 0;
  const minRange = params && params.minRange != null ? Number(params.minRange) : 0.1;
  const maxRange = params && params.maxRange != null ? Number(params.maxRange) : 5;
  if (dayRangePct < NORMAL_RANGE * minRange) return null;
  if (dayRangePct > NORMAL_RANGE * maxRange) return null;

  // The Strategy Lab params define user preferences
  const targetRatio = params && params.rrTarget != null ? Number(params.rrTarget) : 2.0;
  const stopLossPct = params && params.stopLossPct != null ? Number(params.stopLossPct) : 0.5;

  if (allowLong && isHighBreakout && (!trendFilterEnabled || isUptrend)) {
    const stopPrice = price * (1 - stopLossPct / 100);
    const riskAmt = price - stopPrice;
    return {
      direction: 'LONG',
      entryPrice: price,
      stopPrice,
      targetPrice: price + (riskAmt * targetRatio),
      strength: scoreStrength(ctx, 'LONG'),
    };
  }

  if (allowShort && isLowBreakout && (!trendFilterEnabled || isDowntrend)) {
    const stopPrice = price * (1 + stopLossPct / 100);
    const riskAmt = stopPrice - price;
    return {
      direction: 'SHORT',
      entryPrice: price,
      stopPrice,
      targetPrice: price - (riskAmt * targetRatio),
      strength: scoreStrength(ctx, 'SHORT'),
    };
  }

  return null;
}

/**
 * Build the indicator evaluation context for a tick. Prefers the rich indicator
 * set the market-data layer computes from history; falls back to a minimal
 * context (so legacy strategies that only reference price/sma50/day high/low keep
 * working even when the full indicator set is unavailable).
 */
function contextFromMarketData(marketData: MarketData): IndicatorContext {
  if (marketData.indicators) return marketData.indicators;
  const range = marketData.dayHigh - marketData.dayLow;
  return {
    price: marketData.price,
    prevClose: null,
    changePct: null,
    dayHigh: marketData.dayHigh,
    dayLow: marketData.dayLow,
    rangePosition: range > 0 ? ((marketData.price - marketData.dayLow) / range) * 100 : null,
    sma20: null,
    sma50: marketData.sma50,
    sma200: null,
    ema12: null,
    ema26: null,
    macd: null,
    rsi14: null,
    atr14: null,
    atrPct: null,
    volume: null,
  };
}

/** Construct a stop/target signal for a side from the configured risk settings.
 *  Applies the dedup/cooldown guard and attaches a confluence strength score. */
function buildSignal(side: 'LONG' | 'SHORT', price: number, stopLossPct: number, targetRatio: number, ctx?: IndicatorContext, guard?: SignalGuard): Signal {
  if (!allowSignal(guard, side)) return null;
  const strength = ctx ? scoreStrength(ctx, side) : undefined;
  if (side === 'LONG') {
    const stopPrice = price * (1 - stopLossPct / 100);
    const riskAmt = price - stopPrice;
    return { direction: 'LONG', entryPrice: price, stopPrice, targetPrice: price + riskAmt * targetRatio, strength };
  }
  const stopPrice = price * (1 + stopLossPct / 100);
  const riskAmt = stopPrice - price;
  return { direction: 'SHORT', entryPrice: price, stopPrice, targetPrice: price - riskAmt * targetRatio, strength };
}

/** Legacy flat-condition evaluation, kept so bots created before the rule-group
 * upgrade keep trading unchanged. */
function evaluateLegacyConditions(params: Record<string, unknown>, marketData: MarketData): boolean {
  if (!Array.isArray(params.conditions)) return false;
  const getValue = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (val in marketData) return (marketData as unknown as Record<string, number>)[val as string] || 0;
    return Number(val);
  };
  for (const conditionObj of params.conditions as Record<string, unknown>[]) {
    const condition = conditionObj as Record<string, string | number>;
    const lhs = getValue(condition.indicator as string);
    const rhs = getValue(condition.value);
    switch (condition.operator) {
      case '>': if (!(lhs > rhs)) return false; break;
      case '<': if (!(lhs < rhs)) return false; break;
      case '>=': if (!(lhs >= rhs)) return false; break;
      case '<=': if (!(lhs <= rhs)) return false; break;
      case '==': if (!(lhs == rhs)) return false; break;
      default: return false;
    }
  }
  return true;
}

export function evaluateCustomStrategy(params: Record<string, unknown>, marketData: MarketData, openTrade: Trade | null, guard?: SignalGuard): Signal {
  if (openTrade) return null;
  if (!params) return null;

  const ctx = contextFromMarketData(marketData);
  const dir = parseDirection(params.direction);
  const stopLossPct = Number(params.stopLossPct) || 0.5;
  const targetRatio = Number(params.targetRatio) || 2.0;

  // Code mode: run the user's strategy via the transpiler (supports JS, Python,
  // Pine Script, and TradingView). The code fully decides the side (its return
  // value is LONG or SHORT), so we never second-guess it with a direction filter.
  if (params.mode === 'CODE') {
    const code = typeof params.code === 'string' ? params.code : '';
    if (!code.trim()) return null;
    const language = (typeof params.language === 'string' ? params.language : 'javascript') as import('../custom-strategy').StrategyLanguage;
    const decision = runTranspiled(language, code, ctx);
    if (!decision) return null;
    return buildSignal(
      decision.side,
      marketData.price,
      decision.stopLossPct ?? stopLossPct,
      decision.targetRatio ?? targetRatio,
      ctx,
      guard,
    );
  }

  // Rule-builder groups (AND across groups, ALL/ANY within). A strategy set to
  // trade BOTH keeps a separate short ruleset; long conditions win if both fire
  // on the same tick.
  if (Array.isArray(params.groups)) {
    const longGroups = params.groups as ConditionGroup[];
    if (dir === 'BOTH') {
      if (evaluateBuilder(longGroups, ctx)) {
        return buildSignal('LONG', marketData.price, stopLossPct, targetRatio);
      }
      const shortGroups = Array.isArray(params.shortGroups) ? (params.shortGroups as ConditionGroup[]) : [];
      if (shortGroups.length && evaluateBuilder(shortGroups, ctx)) {
        return buildSignal('SHORT', marketData.price, stopLossPct, targetRatio);
      }
      return null;
    }
    if (!evaluateBuilder(longGroups, ctx)) return null;
    return buildSignal(dir === 'SHORT' ? 'SHORT' : 'LONG', marketData.price, stopLossPct, targetRatio);
  }

  // Legacy flat conditions (single-direction by design).
  if (Array.isArray(params.conditions)) {
    if (!evaluateLegacyConditions(params, marketData)) return null;
    return buildSignal(dir === 'SHORT' ? 'SHORT' : 'LONG', marketData.price, stopLossPct, targetRatio);
  }

  return null;
}

export function evaluateExit(openTrade: Trade, marketData: MarketData, params?: Record<string, unknown>): ExitSignal {
  const { price } = marketData;
  const isLong = openTrade.direction === 'LONG';
  
  if (isLong) {
    if (price >= Number(openTrade.targetPrice)) return { reason: 'TARGET', exitPrice: price };
    if (price <= Number(openTrade.stopPrice)) return { reason: 'STOP', exitPrice: price };
  } else {
    if (price <= Number(openTrade.targetPrice)) return { reason: 'TARGET', exitPrice: price };
    if (price >= Number(openTrade.stopPrice)) return { reason: 'STOP', exitPrice: price };
  }

  // Trailing stop logic
  if (params && 'trailingStopPct' in params && params.trailingStopPct) {
    const trailingDist = Number(openTrade.entryPrice) * (Number(params.trailingStopPct) / 100);
    
    if (isLong) {
      const potentialStop = price - trailingDist;
      if (potentialStop > Number(openTrade.stopPrice)) {
        return { reason: 'TRAIL_UPDATE', newStopPrice: potentialStop };
      }
    } else {
      const potentialStop = price + trailingDist;
      if (potentialStop < Number(openTrade.stopPrice)) {
        return { reason: 'TRAIL_UPDATE', newStopPrice: potentialStop };
      }
    }
  }

  return null;
}
