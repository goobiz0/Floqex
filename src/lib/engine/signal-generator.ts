import { MarketData } from './market-data';
import type { Trade } from '@prisma/client';

export type Signal = {
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
} | null;

export type ExitSignal = {
  reason: 'TARGET' | 'STOP';
  exitPrice: number;
} | null;

export function evaluateOrbStrategy(params: any, marketData: MarketData, openTrade: Trade | null): Signal {
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

export function evaluateExit(openTrade: Trade, marketData: MarketData): ExitSignal {
  const { price } = marketData;
  const isLong = openTrade.direction === 'LONG';
  
  if (isLong) {
    if (price >= Number(openTrade.targetPrice)) return { reason: 'TARGET', exitPrice: price };
    if (price <= Number(openTrade.stopPrice)) return { reason: 'STOP', exitPrice: price };
  } else {
    if (price <= Number(openTrade.targetPrice)) return { reason: 'TARGET', exitPrice: price };
    if (price >= Number(openTrade.stopPrice)) return { reason: 'STOP', exitPrice: price };
  }

  return null;
}
