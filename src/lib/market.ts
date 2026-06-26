// Shared market metadata: which market an instrument belongs to, whether that
// market is currently open, and the Yahoo Finance symbol to quote it with.
// Dependency-free timezone math via Intl so DST is handled correctly on both
// the server (RSC, API routes) and the long-running trading engine.

export type MarketKind = "US" | "ASX" | "CRYPTO";

// Common ASX tickers users are likely to trade. Anything ending in ".AX" is
// also treated as ASX automatically (see getMarketForInstrument).
const ASX_TICKERS = new Set([
  "XJO", "BHP", "CBA", "CSL", "NAB", "WBC", "ANZ", "FMG", "WES", "MQG",
  "RIO", "TLS", "WOW", "WDS", "GMG", "TCL", "STO", "QAN", "COL", "ALL",
]);

const CRYPTO_TICKERS = new Set([
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "AVAX", "LINK", "DOT", "MATIC",
]);

// Yahoo Finance symbol mapping. Indices use ^ prefix; ASX equities use .AX;
// crypto uses -USD pairs. US equities/ETFs pass through unchanged.
const YAHOO_SYMBOL: Record<string, string> = {
  // US indices / futures proxies (free tier has no direct futures quotes)
  ES: "^GSPC",
  NQ: "^IXIC",
  SPX: "^GSPC",
  NDX: "^IXIC",
  DJI: "^DJI",
  VIX: "^VIX",
  // ASX index
  XJO: "^AXJO",
  XAO: "^AXAO",
  // Crypto
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  XRP: "XRP-USD",
  ADA: "ADA-USD",
  DOGE: "DOGE-USD",
  AVAX: "AVAX-USD",
  LINK: "LINK-USD",
  DOT: "DOT-USD",
  MATIC: "MATIC-USD",
};

export function normalizeInstrument(instrument: string): string {
  return instrument.trim().toUpperCase();
}

export function getMarketForInstrument(instrument: string): MarketKind {
  const sym = normalizeInstrument(instrument);
  if (sym.endsWith(".AX") || ASX_TICKERS.has(sym)) return "ASX";
  if (CRYPTO_TICKERS.has(sym) || sym.endsWith("-USD") || sym.endsWith("USDT")) return "CRYPTO";
  return "US";
}

// Resolve the Yahoo Finance symbol for an instrument across all markets.
export function getYahooSymbol(instrument: string): string {
  const sym = normalizeInstrument(instrument);
  if (YAHOO_SYMBOL[sym]) return YAHOO_SYMBOL[sym];
  // Bare ASX ticker (e.g. "BHP") -> append .AX so Yahoo resolves the AU listing.
  if (ASX_TICKERS.has(sym) && !sym.endsWith(".AX")) return `${sym}.AX`;
  return sym;
}

// The Trade.session bucket (enum: ASIA | NY) an instrument should be tagged with.
export function getSessionForInstrument(instrument: string): "ASIA" | "NY" {
  return getMarketForInstrument(instrument) === "ASX" ? "ASIA" : "NY";
}

type LocalTime = { hour: number; minute: number; weekday: number };

// Local wall-clock time in a given IANA timezone, DST-correct via Intl.
function localTimeInZone(timeZone: string, at: Date): LocalTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0; // some runtimes emit "24" for midnight
  return {
    hour,
    minute: parseInt(get("minute"), 10),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

// Regular cash-session hours. Crypto trades continuously.
export function isMarketOpen(kind: MarketKind, at: Date = new Date()): boolean {
  if (kind === "CRYPTO") return true;

  if (kind === "US") {
    const t = localTimeInZone("America/New_York", at);
    if (t.weekday < 1 || t.weekday > 5) return false;
    const mins = t.hour * 60 + t.minute;
    return mins >= 9 * 60 + 30 && mins < 16 * 60; // 09:30 - 16:00 ET
  }

  // ASX: 10:00 - 16:00 Sydney time, Mon-Fri.
  const t = localTimeInZone("Australia/Sydney", at);
  if (t.weekday < 1 || t.weekday > 5) return false;
  const mins = t.hour * 60 + t.minute;
  return mins >= 10 * 60 && mins < 16 * 60;
}

export function isInstrumentTradeable(instrument: string, at: Date = new Date()): boolean {
  return isMarketOpen(getMarketForInstrument(instrument), at);
}

export function marketLabel(kind: MarketKind): string {
  if (kind === "US") return "Wall St";
  if (kind === "ASX") return "ASX";
  return "Crypto";
}
