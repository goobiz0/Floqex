// Curated catalogue of commonly traded instruments. This powers the instant,
// zero-latency local search in the asset picker (results show the moment a user
// types, before the live Yahoo search round-trips) and supplies the metadata the
// UI needs to render an icon + ticker + name for any symbol. Live search results
// from the market API are merged on top of this so the long tail of every listed
// instrument is still reachable.

export type AssetMarket = "US" | "ASX" | "CRYPTO";
export type AssetKind = "STOCK" | "ETF" | "INDEX" | "CRYPTO" | "FOREX" | "COMMODITY";

export type Asset = {
  symbol: string;
  name: string;
  market: AssetMarket;
  kind: AssetKind;
};

// A broad, recognisable set across US equities, ETFs, index/futures proxies,
// crypto and the ASX. Not exhaustive by design: the live API search covers the
// rest, this list just makes the common cases feel instant.
export const ASSET_CATALOG: Asset[] = [
  // US mega-cap & popular equities
  { symbol: "AAPL", name: "Apple", market: "US", kind: "STOCK" },
  { symbol: "MSFT", name: "Microsoft", market: "US", kind: "STOCK" },
  { symbol: "NVDA", name: "NVIDIA", market: "US", kind: "STOCK" },
  { symbol: "AMZN", name: "Amazon", market: "US", kind: "STOCK" },
  { symbol: "GOOGL", name: "Alphabet (Class A)", market: "US", kind: "STOCK" },
  { symbol: "META", name: "Meta Platforms", market: "US", kind: "STOCK" },
  { symbol: "TSLA", name: "Tesla", market: "US", kind: "STOCK" },
  { symbol: "AMD", name: "Advanced Micro Devices", market: "US", kind: "STOCK" },
  { symbol: "NFLX", name: "Netflix", market: "US", kind: "STOCK" },
  { symbol: "JPM", name: "JPMorgan Chase", market: "US", kind: "STOCK" },
  { symbol: "V", name: "Visa", market: "US", kind: "STOCK" },
  { symbol: "DIS", name: "Walt Disney", market: "US", kind: "STOCK" },
  { symbol: "COIN", name: "Coinbase", market: "US", kind: "STOCK" },
  { symbol: "PLTR", name: "Palantir", market: "US", kind: "STOCK" },
  { symbol: "BABA", name: "Alibaba", market: "US", kind: "STOCK" },
  { symbol: "INTC", name: "Intel", market: "US", kind: "STOCK" },
  { symbol: "BA", name: "Boeing", market: "US", kind: "STOCK" },
  { symbol: "UBER", name: "Uber Technologies", market: "US", kind: "STOCK" },
  { symbol: "SHOP", name: "Shopify", market: "US", kind: "STOCK" },
  { symbol: "SOFI", name: "SoFi Technologies", market: "US", kind: "STOCK" },

  // US ETFs
  { symbol: "SPY", name: "SPDR S&P 500 ETF", market: "US", kind: "ETF" },
  { symbol: "QQQ", name: "Invesco QQQ (Nasdaq 100)", market: "US", kind: "ETF" },
  { symbol: "IWM", name: "iShares Russell 2000", market: "US", kind: "ETF" },
  { symbol: "DIA", name: "SPDR Dow Jones ETF", market: "US", kind: "ETF" },
  { symbol: "VTI", name: "Vanguard Total Market", market: "US", kind: "ETF" },
  { symbol: "ARKK", name: "ARK Innovation ETF", market: "US", kind: "ETF" },
  { symbol: "GLD", name: "SPDR Gold Shares", market: "US", kind: "COMMODITY" },
  { symbol: "USO", name: "United States Oil Fund", market: "US", kind: "COMMODITY" },

  // US index / futures proxies (the engine quotes these via the index)
  { symbol: "NQ", name: "Nasdaq 100 (futures proxy)", market: "US", kind: "INDEX" },
  { symbol: "ES", name: "S&P 500 (futures proxy)", market: "US", kind: "INDEX" },
  { symbol: "SPX", name: "S&P 500 Index", market: "US", kind: "INDEX" },
  { symbol: "NDX", name: "Nasdaq 100 Index", market: "US", kind: "INDEX" },
  { symbol: "DJI", name: "Dow Jones Industrial", market: "US", kind: "INDEX" },
  { symbol: "VIX", name: "CBOE Volatility Index", market: "US", kind: "INDEX" },

  // Crypto
  { symbol: "BTC", name: "Bitcoin", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "ETH", name: "Ethereum", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "SOL", name: "Solana", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "XRP", name: "XRP", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "ADA", name: "Cardano", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "DOGE", name: "Dogecoin", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "AVAX", name: "Avalanche", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "LINK", name: "Chainlink", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "DOT", name: "Polkadot", market: "CRYPTO", kind: "CRYPTO" },
  { symbol: "MATIC", name: "Polygon", market: "CRYPTO", kind: "CRYPTO" },

  // ASX
  { symbol: "XJO", name: "S&P/ASX 200 Index", market: "ASX", kind: "INDEX" },
  { symbol: "BHP.AX", name: "BHP Group", market: "ASX", kind: "STOCK" },
  { symbol: "CBA.AX", name: "Commonwealth Bank", market: "ASX", kind: "STOCK" },
  { symbol: "CSL.AX", name: "CSL Limited", market: "ASX", kind: "STOCK" },
  { symbol: "NAB.AX", name: "National Australia Bank", market: "ASX", kind: "STOCK" },
  { symbol: "WBC.AX", name: "Westpac Banking", market: "ASX", kind: "STOCK" },
  { symbol: "FMG.AX", name: "Fortescue", market: "ASX", kind: "STOCK" },
  { symbol: "WES.AX", name: "Wesfarmers", market: "ASX", kind: "STOCK" },
  { symbol: "RIO.AX", name: "Rio Tinto", market: "ASX", kind: "STOCK" },
  { symbol: "QAN.AX", name: "Qantas Airways", market: "ASX", kind: "STOCK" },
];

const CATALOG_BY_SYMBOL = new Map(ASSET_CATALOG.map((a) => [a.symbol.toUpperCase(), a]));

/** Look up curated metadata for a symbol, if we have it. */
export function getAsset(symbol: string): Asset | undefined {
  return CATALOG_BY_SYMBOL.get(symbol.trim().toUpperCase());
}

const MARKET_LABEL: Record<AssetMarket, string> = { US: "Wall St", ASX: "ASX", CRYPTO: "Crypto" };
export function marketLabelFor(market: AssetMarket): string {
  return MARKET_LABEL[market];
}

const KIND_LABEL: Record<AssetKind, string> = {
  STOCK: "Stock",
  ETF: "ETF",
  INDEX: "Index",
  CRYPTO: "Crypto",
  FOREX: "Forex",
  COMMODITY: "Commodity",
};
export function kindLabelFor(kind: AssetKind): string {
  return KIND_LABEL[kind];
}

/**
 * Rank-and-filter the local catalogue for an instant dropdown. Ordering: exact
 * ticker, then ticker prefix, then ticker substring, then name substring. Ties
 * break alphabetically so results are stable as the user types.
 */
export function searchLocalAssets(query: string, limit = 8): Asset[] {
  const q = query.trim().toUpperCase();
  if (!q) {
    // Empty query: surface a sensible default shortlist (majors first).
    return ASSET_CATALOG.slice(0, limit);
  }

  const scored: { asset: Asset; score: number }[] = [];
  for (const asset of ASSET_CATALOG) {
    const sym = asset.symbol.toUpperCase();
    const name = asset.name.toUpperCase();
    let score = -1;
    if (sym === q) score = 0;
    else if (sym.startsWith(q)) score = 1;
    else if (sym.includes(q)) score = 2;
    else if (name.startsWith(q)) score = 3;
    else if (name.includes(q)) score = 4;
    if (score >= 0) scored.push({ asset, score });
  }

  scored.sort((a, b) => a.score - b.score || a.asset.symbol.localeCompare(b.asset.symbol));
  return scored.slice(0, limit).map((s) => s.asset);
}

/**
 * Merge curated + live search results into one de-duplicated list, preferring
 * curated metadata (richer kind/name) when a symbol appears in both. Local
 * matches lead so the list stays stable while live results stream in.
 */
export function mergeAssetResults(local: Asset[], live: Asset[], limit = 10): Asset[] {
  const seen = new Set<string>();
  const out: Asset[] = [];
  for (const a of [...local, ...live]) {
    const key = a.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}
