import { getRealMarketData } from "./market-data";
import { parseCustomConfig, evaluateCondition } from "../custom-strategy";
import type { IndicatorContext } from "./indicators";

export type ConditionResult = {
  left: string;
  op: string;
  right: string | number;
  met: boolean;
};

export type GroupResult = {
  join: "ALL" | "ANY";
  conditions: ConditionResult[];
  met: boolean;
};

export type PreviewResult = {
  instrument: string;
  price: number | null;
  direction: "LONG" | "SHORT";
  groups: GroupResult[];
  allMet: boolean;
  error?: string;
};

function contextFromMarketData(marketData: import('./market-data').MarketData): IndicatorContext {
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

export async function previewConditions(
  params: Record<string, unknown>,
  instrument: string
): Promise<PreviewResult> {
  const md = await getRealMarketData(instrument);
  if (!md) {
    return {
      instrument,
      price: null,
      direction: "LONG",
      groups: [],
      allMet: false,
      error: "No market data available",
    };
  }

  const ctx = contextFromMarketData(md);
  const parsed = parseCustomConfig(params);
  
  if (!parsed.ok || parsed.config.mode !== "BUILDER") {
    return {
      instrument,
      price: md.price,
      direction: "LONG",
      groups: [],
      allMet: false,
      error: parsed.ok ? "Debugger only supports Rule Builder strategies" : parsed.error,
    };
  }

  const direction = parsed.config.direction;
  const groupsRaw = parsed.config.groups;
  
  const groups: GroupResult[] = groupsRaw.map(g => {
    const conditions = g.conditions.map(c => ({
      left: c.left,
      op: c.op,
      right: c.right.kind === "value" ? c.right.value : c.right.key,
      met: evaluateCondition(c, ctx)
    }));
    
    const met = g.join === "ANY" 
      ? conditions.some(c => c.met)
      : conditions.length > 0 && conditions.every(c => c.met);
      
    return { join: g.join, conditions, met };
  });

  const allMet = groups.length > 0 && groups.every(g => g.met);
  const previewDirection: "LONG" | "SHORT" = direction === "SHORT" ? "SHORT" : "LONG";

  return { instrument, price: md.price, direction: previewDirection, groups, allMet };
}
