import YahooFinance from 'yahoo-finance2';
import ccxt from 'ccxt';
import { getYahooSymbol, getMarketForInstrument, normalizeInstrument, isInstrumentTradeable, type MarketKind } from '@/lib/market';
import { computeIndicatorContext, type IndicatorContext } from './indicators';

// yahoo-finance2 v3 ships the API as a CLASS that must be instantiated — calling
// the methods statically (the v2 style) throws "Call `new YahooFinance()`
// first.". That single mistake silently broke every quote/historical lookup,
// which is why both the live engine and the market search returned no data. We
// instantiate one client per process and suppress the noisy survey/deprecation
// notices.
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

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
  /** Full indicator set computed from daily history. Optional so any failure to
   * compute it never blocks the core quote; consumers fall back gracefully. */
  indicators?: IndicatorContext;
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

    // Compute the full indicator set from daily history (cached). SMA50 is taken
    // from the same context so we fetch history once. Guarded so any failure
    // leaves the core quote intact.
    const cachedSma = smaCache[symbol];
    let sma50: number | null = cachedSma && cachedSma.expiresAt > Date.now() ? cachedSma.value : null;
    let indicators: IndicatorContext | undefined;
    try {
      const bars = await getHistoryBars(instrument, 220);
      if (bars.length >= 2) {
        indicators = computeIndicatorContext(bars, {
          price: quote.regularMarketPrice as number,
          dayHigh: quote.regularMarketDayHigh as number,
          dayLow: quote.regularMarketDayLow as number,
          prevClose: (quote.regularMarketPreviousClose as number) ?? null,
          volume: (quote.regularMarketVolume as number) ?? null,
        });
        if (indicators.sma50 != null) {
          sma50 = indicators.sma50;
          pruneCache(smaCache, 1000);
          smaCache[symbol] = { value: sma50, expiresAt: Date.now() + 1000 * 60 * 60 };
        }
      }
    } catch (e) {
      console.warn('Could not compute indicators', e);
    }

    const data: MarketData = {
      price: quote.regularMarketPrice as number,
      dayHigh: quote.regularMarketDayHigh as number,
      dayLow: quote.regularMarketDayLow as number,
      sma50,
      market,
      isOpen: isInstrumentTradeable(instrument),
      timestamp: (quote.regularMarketTime as Date) || new Date(),
      indicators,
    };

    pruneCache(quoteCache, 1000);
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
  marketCap?: number;
  volume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  trailingPE?: number;
}

function pruneCache<T extends { expiresAt: number }>(cache: Record<string, T>, max: number): void {
  const now = Date.now();
  for (const key of Object.keys(cache)) {
    if (cache[key].expiresAt <= now) delete cache[key];
  }
  const keys = Object.keys(cache);
  if (keys.length >= max) {
    keys.sort((a, b) => cache[a].expiresAt - cache[b].expiresAt);
    for (const key of keys.slice(0, Math.ceil(max / 4))) delete cache[key];
  }
}

// Snapshot quotes are cached for a few seconds so the markets search feels
// instant: re-selecting a symbol or the 5s poll re-uses the last fetch instead
// of waiting on Yahoo every time. The open flag is refreshed on every read.
const snapshotCache: Record<string, { data: QuoteSnapshot; expiresAt: number }> = {};
const SNAPSHOT_TTL_MS = 4000;
const SNAPSHOT_MAX = 200;

export async function getQuoteSnapshot(instrument: string): Promise<QuoteSnapshot | null> {
  const symbol = getYahooSymbol(instrument);
  const cached = snapshotCache[symbol];
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, isOpen: isInstrumentTradeable(instrument) };
  }
  try {
    const q = (await yahooFinance.quote(symbol)) as Record<string, unknown>;
    if (!q || q.regularMarketPrice == null) return null;
    const snapshot: QuoteSnapshot = {
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
      marketCap: (q.marketCap as number) ?? undefined,
      volume: (q.regularMarketVolume as number) ?? undefined,
      fiftyTwoWeekHigh: (q.fiftyTwoWeekHigh as number) ?? undefined,
      fiftyTwoWeekLow: (q.fiftyTwoWeekLow as number) ?? undefined,
      trailingPE: (q.trailingPE as number) ?? undefined,
    };
    pruneCache(snapshotCache, SNAPSHOT_MAX);
    snapshotCache[symbol] = { data: snapshot, expiresAt: Date.now() + SNAPSHOT_TTL_MS };
    return snapshot;
  } catch (error) {
    console.error(`Quote snapshot error for ${symbol}:`, error);
    return null;
  }
}

// Top movers for the dashboard widget. Real Yahoo snapshots for a curated
// universe of liquid instruments, ranked by the regular-session percent change.
// The whole result is cached briefly so the widget's poll and multiple users
// share one upstream fetch rather than hammering Yahoo per render.
export interface MoverRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface MoversResult {
  gainers: MoverRow[];
  losers: MoverRow[];
  asOf: string; // ISO timestamp of the fetch
}

const moversCache: Record<string, { data: MoversResult; expiresAt: number }> = {};
// Per-universe in-flight fetch, so a burst of widget polls after the TTL expires
// shares one upstream fan-out instead of each running its own Promise.all.
const moversInflight: Record<string, Promise<MoversResult>> = {};
const MOVERS_TTL_MS = 1000 * 30; // 30s: fresh enough, kind to rate limits

export async function getMarketMovers(universe: string[], perSide = 5): Promise<MoversResult> {
  const key = `${universe.join(",")}::${perSide}`;
  const cached = moversCache[key];
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  if (key in moversInflight) return moversInflight[key];

  const fetchMovers = async (): Promise<MoversResult> => {
    const snapshots = await Promise.all(
      universe.map((sym) => getQuoteSnapshot(sym).catch(() => null)),
    );
    const rows: MoverRow[] = snapshots
      .filter((s): s is QuoteSnapshot => s != null && Number.isFinite(s.changePercent))
      .map((s) => ({
        symbol: s.instrument,
        name: s.shortName,
        price: s.price,
        change: s.change,
        changePercent: s.changePercent,
        currency: s.currency,
      }));

    const byChangeDesc = [...rows].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = byChangeDesc.filter((r) => r.changePercent > 0).slice(0, perSide);
    const losers = [...byChangeDesc].reverse().filter((r) => r.changePercent < 0).slice(0, perSide);

    const data: MoversResult = { gainers, losers, asOf: new Date().toISOString() };
    moversCache[key] = { data, expiresAt: Date.now() + MOVERS_TTL_MS };
    return data;
  };

  const promise = fetchMovers().finally(() => {
    delete moversInflight[key];
  });
  moversInflight[key] = promise;
  return promise;
}

// Daily OHLC bars for the strategy backtest/sandbox. Real Yahoo history, mapped
// to a compact shape and cached briefly so repeated previews are cheap.
export interface HistoryBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
}

const historyCache: Record<string, { bars: HistoryBar[]; expiresAt: number }> = {};
const HISTORY_TTL_MS = 1000 * 60 * 30; // 30 minutes

export async function getHistoryBars(instrument: string, days = 180): Promise<HistoryBar[]> {
  const symbol = getYahooSymbol(instrument);
  const cacheKey = `${symbol}:${days}`;
  const cached = historyCache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) return cached.bars;

  try {
    const start = new Date();
    start.setDate(start.getDate() - days);
    const rows = (await yahooFinance.historical(symbol, {
      period1: start.toISOString().split("T")[0],
      period2: new Date().toISOString().split("T")[0],
    })) as unknown as Array<{ date: Date | string; open: number; high: number; low: number; close: number }>;

    const bars: HistoryBar[] = (rows ?? [])
      .filter((r) => r && r.open != null && r.high != null && r.low != null && r.close != null)
      .map((r) => ({
        date: (r.date instanceof Date ? r.date.toISOString() : String(r.date)).slice(0, 10),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
      }));

    historyCache[cacheKey] = { bars, expiresAt: Date.now() + HISTORY_TTL_MS };
    return bars;
  } catch (error) {
    console.error(`History fetch error for ${symbol}:`, error);
    return [];
  }
}

// Symbol autocomplete for the market search. Lets a user find *any* listed
// instrument by name or ticker (e.g. "apple", "GOOGL", "uranium") rather than
// only the handful of suggestion chips, then resolves it to a tradeable symbol.
export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  market: MarketKind;
}

// Autocomplete results are cached briefly per query so repeated/typed-again
// searches return instantly instead of round-tripping to Yahoo each keystroke.
const searchCache: Record<string, { results: SymbolSearchResult[]; expiresAt: number }> = {};
const SEARCH_TTL_MS = 1000 * 60; // 1 minute
const SEARCH_MAX = 500;

export async function searchSymbols(query: string, limit = 8): Promise<SymbolSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const cacheKey = `${q.toLowerCase()}:${limit}`;
  const cached = searchCache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  try {
    const res = (await yahooFinance.search(q, { newsCount: 0, quotesCount: limit + 4 })) as {
      quotes?: Array<Record<string, unknown>>;
    };
    const quotes = res?.quotes ?? [];
    const seen = new Set<string>();
    const out: SymbolSearchResult[] = [];
    for (const item of quotes) {
      const symbol = typeof item.symbol === "string" ? item.symbol : null;
      // Skip news hits and anything without a real tradeable symbol.
      if (!symbol || item.isYahooFinance === false || seen.has(symbol)) continue;
      seen.add(symbol);
      out.push({
        symbol,
        name: (item.shortname as string) || (item.longname as string) || symbol,
        exchange: (item.exchange as string) || "",
        type: (item.quoteType as string) || "",
        market: getMarketForInstrument(symbol),
      });
      if (out.length >= limit) break;
    }
    pruneCache(searchCache, SEARCH_MAX);
    searchCache[cacheKey] = { results: out, expiresAt: Date.now() + SEARCH_TTL_MS };
    return out;
  } catch (error) {
    console.error(`Symbol search error for "${q}":`, error);
    return [];
  }
}

// ─────────────────────── Intraday bars (Validation Lab) ─────────────────────
//
// The flagship ORB strategy is intraday, so honest validation needs intraday
// bars, not daily. Equities/indices come from Yahoo's chart endpoint (which has
// real lookback limits per granularity, surfaced to the user). Crypto comes from
// CCXT, which serves deep history at any granularity. We never fabricate bars: if
// a source can't supply the window, we return what's real and label it.

export type Interval = "1m" | "5m" | "15m" | "1h";

// Yahoo's documented intraday lookback ceilings (calendar days) per granularity.
const YAHOO_MAX_LOOKBACK: Record<Interval, number> = { "1m": 7, "5m": 58, "15m": 58, "1h": 720 };
const CCXT_TIMEFRAME: Record<Interval, string> = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h" };

export interface IntradayResult {
  bars: HistoryBar[]; // `date` is a full ISO timestamp, ordered oldest -> newest
  interval: Interval;
  days: number;
  source: string;
}

const intradayCache: Record<string, { data: IntradayResult; expiresAt: number }> = {};
const INTRADAY_TTL_MS = 1000 * 60 * 10; // 10 minutes

let binanceClient: InstanceType<typeof ccxt.binance> | null = null;
function getBinance(): InstanceType<typeof ccxt.binance> {
  if (!binanceClient) binanceClient = new ccxt.binance({ enableRateLimit: true });
  return binanceClient;
}

// Map an instrument to a CCXT spot pair (e.g. "BTC" or "BTC-USD" -> "BTC/USDT").
function ccxtPair(instrument: string): string {
  const sym = normalizeInstrument(instrument);
  const base = sym.replace(/-USD$/, "").replace(/USDT$/, "").replace(/USD$/, "");
  return `${base}/USDT`;
}

export async function getIntradayBars(instrument: string, interval: Interval = "5m", lookbackDays = 30): Promise<IntradayResult> {
  const market = getMarketForInstrument(instrument);
  const cacheKey = `${normalizeInstrument(instrument)}:${interval}:${lookbackDays}`;
  const cached = intradayCache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let result: IntradayResult = { bars: [], interval, days: 0, source: market === "CRYPTO" ? "Binance" : "Yahoo Finance" };

  try {
    if (market === "CRYPTO") {
      const ex = getBinance();
      const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
      const raw = (await ex.fetchOHLCV(ccxtPair(instrument), CCXT_TIMEFRAME[interval], since, 1000)) as number[][];
      const bars: HistoryBar[] = raw
        .filter((r) => Array.isArray(r) && r[1] != null && r[2] != null && r[3] != null && r[4] != null)
        .map((r) => ({ date: new Date(r[0]).toISOString(), open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]) }));
      result = { bars, interval, days: countDays(bars), source: "Binance" };
    } else {
      const symbol = getYahooSymbol(instrument);
      const clampedLookback = Math.min(lookbackDays, YAHOO_MAX_LOOKBACK[interval]);
      const start = new Date(Date.now() - clampedLookback * 24 * 60 * 60 * 1000);
      const chart = (await yahooFinance.chart(symbol, {
        period1: start,
        period2: new Date(),
        interval: interval === "1h" ? "60m" : interval,
      })) as unknown as { quotes?: Array<{ date: Date | string; open: number | null; high: number | null; low: number | null; close: number | null }> };
      const bars: HistoryBar[] = (chart?.quotes ?? [])
        .filter((r) => r && r.open != null && r.high != null && r.low != null && r.close != null)
        .map((r) => ({
          date: r.date instanceof Date ? r.date.toISOString() : new Date(r.date).toISOString(),
          open: Number(r.open),
          high: Number(r.high),
          low: Number(r.low),
          close: Number(r.close),
        }));
      result = { bars, interval, days: countDays(bars), source: "Yahoo Finance" };
    }
  } catch (error) {
    console.error(`Intraday fetch error for ${instrument} (${interval}):`, error);
    return result;
  }

  intradayCache[cacheKey] = { data: result, expiresAt: Date.now() + INTRADAY_TTL_MS };
  return result;
}

function countDays(bars: HistoryBar[]): number {
  const days = new Set(bars.map((b) => b.date.slice(0, 10)));
  return days.size;
}
