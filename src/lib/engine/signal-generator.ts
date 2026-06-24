import { MarketData } from './market-data';
import type { Trade } from '@prisma/client';

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

  // Prevent entering trades if there isn't enough range (avoids flat market chops)
  if (range / price < 0.001) return null;

  // The Strategy Lab params define user preferences
  const targetRatio = params && params.rrTarget ? Number(params.rrTarget) : 2.0;

  if (isHighBreakout && (!trendFilterEnabled || isUptrend)) {
    const stopPrice = price * 0.995; // 0.5% stop distance
    const riskAmt = price - stopPrice;
    return {
      direction: 'LONG',
      entryPrice: price,
      stopPrice,
      targetPrice: price + (riskAmt * targetRatio),
    };
  }

  if (isLowBreakout && (!trendFilterEnabled || isDowntrend)) {
    const stopPrice = price * 1.005; 
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

export function evaluateCustomStrategy(params: Record<string, unknown>, marketData: MarketData, openTrade: Trade | null): Signal {
  if (openTrade) return null;
  if (!params || !params.conditions || !Array.isArray(params.conditions)) return null;

  const getValue = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (val in marketData) return (marketData as unknown as Record<string, number>)[val as string] || 0;
    return Number(val);
  };

  let allTrue = true;
  for (const conditionObj of params.conditions as Record<string, unknown>[]) {
    const condition = conditionObj as Record<string, string | number>;
    const lhs = getValue(condition.indicator as string);
    const rhs = getValue(condition.value);
    
    switch (condition.operator) {
      case '>': if (!(lhs > rhs)) allTrue = false; break;
      case '<': if (!(lhs < rhs)) allTrue = false; break;
      case '>=': if (!(lhs >= rhs)) allTrue = false; break;
      case '<=': if (!(lhs <= rhs)) allTrue = false; break;
      case '==': if (!(lhs == rhs)) allTrue = false; break;
      default: allTrue = false;
    }
    if (!allTrue) break;
  }

  if (allTrue) {
    // If the strategy can go BOTH ways, we would need more logic. 
    // For simplicity, assume the user explicitly stated LONG or SHORT in the AST.
    const direction = params.direction === 'SHORT' ? 'SHORT' : 'LONG';
    const price = marketData.price;
    const stopLossPct = Number(params.stopLossPct) || 0.5;
    const targetRatio = Number(params.targetRatio) || 2.0;

    if (direction === 'LONG') {
      const stopPrice = price * (1 - (stopLossPct / 100));
      const riskAmt = price - stopPrice;
      return {
        direction: 'LONG',
        entryPrice: price,
        stopPrice,
        targetPrice: price + (riskAmt * targetRatio),
      };
    } else {
      const stopPrice = price * (1 + (stopLossPct / 100));
      const riskAmt = stopPrice - price;
      return {
        direction: 'SHORT',
        entryPrice: price,
        stopPrice,
        targetPrice: price - (riskAmt * targetRatio),
      };
    }
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
