import yahooFinance from 'yahoo-finance2';
import { getYahooSymbol, getMarketForInstrument, isInstrumentTradeable, type MarketKind } from '@/lib/market';

// In-memory caches. The engine is a single long-running worker, so an in-memory
// cache is effective and avoids a hard Redis dependency. Quotes are cached for a
// few seconds (fresh enough for a 2s tick, but kind to Yahoo's rate limits);
// the 50-day SMA is cached for an hour.
const smaCache: Record<string, { value: number; expiresAt: number }> = {};
const quoteCache: Record<string, { data: MarketData; expiresAt: number }> = {};
const QUOTE_TTL_MS = 5000;

export interface MarketData {
  price: number;
  dayHigh: number;
  dayLow: number;
  sma50: number | null;
  market: MarketKind;
  isOpen: boolean;
  timestamp: Date;
}

export async function getRealMarketData(instrument: string): Promise<MarketData | null> {
  const symbol = getYahooSymbol(instrument);
  const market = getMarketForInstrument(instrument);

  const cached = quoteCache[symbol];
  if (cached && cached.expiresAt > Date.now()) {
    // Refresh the open flag (cheap) without re-hitting the network.
    return { ...cached.data, isOpen: isInstrumentTradeable(instrument) };
  }

  try {
    const quote = (await yahooFinance.quote(symbol)) as Record<string, unknown>;
    if (!quote || !quote.regularMarketPrice || !quote.regularMarketDayHigh || !quote.regularMarketDayLow) {
      return null;
    }

    // Fetch historical data for SMA50 (cached for an hour per symbol).
    let sma50: number | null = null;
    if (smaCache[symbol] && smaCache[symbol].expiresAt > Date.now()) {
      sma50 = smaCache[symbol].value;
    } else {
      try {
        const today = new Date();
        const eightyDaysAgo = new Date();
        eightyDaysAgo.setDate(eightyDaysAgo.getDate() - 80);
        const history = (await yahooFinance.historical(symbol, {
          period1: eightyDaysAgo.toISOString().split('T')[0],
          period2: today.toISOString().split('T')[0],
        })) as unknown as Array<{ close: number }>;

        if (history && history.length >= 50) {
          const last50 = history.slice(-50);
          const sum = last50.reduce((acc, bar) => acc + bar.close, 0);
          sma50 = sum / 50;
          smaCache[symbol] = { value: sma50, expiresAt: Date.now() + 1000 * 60 * 60 };
        }
      } catch (e) {
        console.warn('Could not fetch historical data for SMA', e);
      }
    }

    const data: MarketData = {
      price: quote.regularMarketPrice as number,
      dayHigh: quote.regularMarketDayHigh as number,
      dayLow: quote.regularMarketDayLow as number,
      sma50,
      market,
      isOpen: isInstrumentTradeable(instrument),
      timestamp: (quote.regularMarketTime as Date) || new Date(),
    };

    quoteCache[symbol] = { data, expiresAt: Date.now() + QUOTE_TTL_MS };
    return data;
  } catch (error) {
    console.error(`Market data fetch error for ${symbol}:`, error);
    return null;
  }
}

// Lightweight quote for the stock-search / live-data feature. Returns the
// headline numbers a user wants when looking up a symbol.
export interface QuoteSnapshot {
  symbol: string;
  instrument: string;
  market: MarketKind;
  isOpen: boolean;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  currency: string;
  shortName: string;
  timestamp: Date;
}

export async function getQuoteSnapshot(instrument: string): Promise<QuoteSnapshot | null> {
  const symbol = getYahooSymbol(instrument);
  try {
    const q = (await yahooFinance.quote(symbol)) as Record<string, unknown>;
    if (!q || q.regularMarketPrice == null) return null;
    return {
      symbol,
      instrument: instrument.trim().toUpperCase(),
      market: getMarketForInstrument(instrument),
      isOpen: isInstrumentTradeable(instrument),
      price: q.regularMarketPrice as number,
      change: (q.regularMarketChange as number) ?? 0,
      changePercent: (q.regularMarketChangePercent as number) ?? 0,
      dayHigh: (q.regularMarketDayHigh as number) ?? 0,
      dayLow: (q.regularMarketDayLow as number) ?? 0,
      previousClose: (q.regularMarketPreviousClose as number) ?? 0,
      currency: (q.currency as string) ?? 'USD',
      shortName: (q.shortName as string) || (q.longName as string) || symbol,
      timestamp: (q.regularMarketTime as Date) || new Date(),
    };
  } catch (error) {
    console.error(`Quote snapshot error for ${symbol}:`, error);
    return null;
  }
}
