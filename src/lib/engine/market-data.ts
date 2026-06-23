import yahooFinance from 'yahoo-finance2';

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
  
  try {
    const quote = await yahooFinance.quote(symbol);
    if (!quote || !quote.regularMarketPrice || !quote.regularMarketDayHigh || !quote.regularMarketDayLow) {
      return null;
    }
    
    // Fetch historical data for SMA50
    const period1 = new Date();
    period1.setDate(period1.getDate() - 80); 
    
    let sma50 = null;
    try {
      const history = await yahooFinance.historical(symbol, {
        period1: period1.toISOString().split('T')[0],
        interval: "1d"
      });
      
      if (history && history.length >= 50) {
        const last50 = history.slice(-50);
        const sum = last50.reduce((acc, bar) => acc + bar.close, 0);
        sma50 = sum / 50;
      }
    } catch (e) {
      console.warn("Could not fetch historical data for SMA", e);
    }
    
    return {
      price: quote.regularMarketPrice,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      sma50,
      timestamp: quote.regularMarketTime || new Date(),
    };
  } catch (error) {
    console.error(`Market data fetch error for ${symbol}:`, error);
    return null;
  }
}
