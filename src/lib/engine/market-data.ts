import yahooFinance from 'yahoo-finance2';

// In-memory cache for SMA50 (1 hour expiry)
const smaCache: Record<string, { value: number; expiresAt: number }> = {};
export interface MarketData {
  price: number;
  dayHigh: number;
  dayLow: number;
  sma50: number | null;
  timestamp: Date;
}

export async function getRealMarketData(instrument: string): Promise<MarketData | null> {
  const symbolMap: Record<string, string> = {
    'ES': '^GSPC', // S&P 500 (using index as proxy for futures for free tier)
    'NQ': '^IXIC', // NASDAQ
    'BTC': 'BTC-USD',
    'ETH': 'ETH-USD',
    'SPY': 'SPY',
    'QQQ': 'QQQ',
  };
  
  const symbol = symbolMap[instrument] || instrument;
  
  // TODO (Performance): Add Redis/KV caching to reduce API calls
  // const cacheKey = `market:data:${symbol}`;
  // const cached = await redis.get(cacheKey);
  // if (cached) return JSON.parse(cached);
  
    try {
      const quote = (await yahooFinance.quote(symbol)) as Record<string, unknown>;
      if (!quote || !quote.regularMarketPrice || !quote.regularMarketDayHigh || !quote.regularMarketDayLow) {
        return null;
      }
      
      // Fetch historical data for SMA50
      const today = new Date();
      const eightyDaysAgo = new Date();
      eightyDaysAgo.setDate(eightyDaysAgo.getDate() - 80); 
      
      let sma50: number | null = null;
      
      if (smaCache[symbol] && smaCache[symbol].expiresAt > Date.now()) {
        sma50 = smaCache[symbol].value;
      } else {
        try {
          const history = (await yahooFinance.historical(symbol, {
            period1: eightyDaysAgo.toISOString().split("T")[0],
            period2: today.toISOString().split("T")[0],
          })) as unknown as Array<{ close: number }>;
        
        if (history && history.length >= 50) {
          const last50 = history.slice(-50);
          const sum = last50.reduce((acc, bar) => acc + bar.close, 0);
          sma50 = sum / 50;
          smaCache[symbol] = {
            value: sma50,
            expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour cache
          };
        }
      } catch (e) {
        console.warn("Could not fetch historical data for SMA", e);
      }
    }
    
    const data = {
      price: quote.regularMarketPrice as number,
      dayHigh: quote.regularMarketDayHigh as number,
      dayLow: quote.regularMarketDayLow as number,
      sma50,
      timestamp: (quote.regularMarketTime as Date) || new Date(),
    };
    
    // TODO (Performance): Cache the result
    // await redis.set(cacheKey, JSON.stringify(data), { ex: 60 }); // Cache for 60s
    
    return data;
  } catch (error) {
    console.error(`Market data fetch error for ${symbol}:`, error);
    return null;
  }
}
