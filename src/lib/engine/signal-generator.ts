import { MarketData } from './market-data';
import type { Trade } from '@prisma/client';
import { evaluateBuilder, type ConditionGroup } from '../custom-strategy';
import { runTranspiled } from './transpile';
import type { IndicatorContext } from './indicators';

export type Signal = {
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
} | null;

export type ExitSignal = {
  reason: 'TARGET' | 'STOP' | 'TRAIL_UPDATE';
  exitPrice?: number;
  newStopPrice?: number;
} | null;

export function evaluateOrbStrategy(params: Record<string, unknown>, marketData: MarketData, openTrade: Trade | null): Signal {
  if (openTrade) return null;

  const { price, dayHigh, dayLow, sma50 } = marketData;
  const range = dayHigh - dayLow;
  
  const trendFilterEnabled = params && params.trendFilter === true;
  const isUptrend = sma50 ? price > sma50 : true;
  const isDowntrend = sma50 ? price < sma50 : true;
  
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

  if (isHighBreakout && (!trendFilterEnabled || isUptrend)) {
    const stopPrice = price * (1 - stopLossPct / 100); 
    const riskAmt = price - stopPrice;
    return {
      direction: 'LONG',
      entryPrice: price,
      stopPrice,
      targetPrice: price + (riskAmt * targetRatio),
    };
  }

  if (isLowBreakout && (!trendFilterEnabled || isDowntrend)) {
    const stopPrice = price * (1 + stopLossPct / 100); 
    const riskAmt = stopPrice - price;
    return {
      direction: 'SHORT',
      entryPrice: price,
      stopPrice,
      targetPrice: price - (riskAmt * targetRatio),
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

/** Construct a stop/target signal for a side from the configured risk settings. */
function buildSignal(side: 'LONG' | 'SHORT', price: number, stopLossPct: number, targetRatio: number): Signal {
  if (side === 'LONG') {
    const stopPrice = price * (1 - stopLossPct / 100);
    const riskAmt = price - stopPrice;
    return { direction: 'LONG', entryPrice: price, stopPrice, targetPrice: price + riskAmt * targetRatio };
  }
  const stopPrice = price * (1 + stopLossPct / 100);
  const riskAmt = stopPrice - price;
  return { direction: 'SHORT', entryPrice: price, stopPrice, targetPrice: price - riskAmt * targetRatio };
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

export function evaluateCustomStrategy(params: Record<string, unknown>, marketData: MarketData, openTrade: Trade | null): Signal {
  if (openTrade) return null;
  if (!params) return null;

  const ctx = contextFromMarketData(marketData);
  const direction = params.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const stopLossPct = Number(params.stopLossPct) || 0.5;
  const targetRatio = Number(params.targetRatio) || 2.0;

  // Code mode: run the user's strategy via the transpiler (supports JS, Python,
  // Pine Script, and TradingView).
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
    );
  }

  // Rule-builder groups (AND across groups, ALL/ANY within).
  if (Array.isArray(params.groups)) {
    if (!evaluateBuilder(params.groups as ConditionGroup[], ctx)) return null;
    return buildSignal(direction, marketData.price, stopLossPct, targetRatio);
  }

  // Legacy flat conditions.
  if (Array.isArray(params.conditions)) {
    if (!evaluateLegacyConditions(params, marketData)) return null;
    return buildSignal(direction, marketData.price, stopLossPct, targetRatio);
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
