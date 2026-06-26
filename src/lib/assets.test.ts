import { describe, it, expect } from "vitest";
import { searchLocalAssets, mergeAssetResults, getAsset, type Asset } from "./assets";

describe("searchLocalAssets", () => {
  it("returns a default shortlist for an empty query", () => {
    const res = searchLocalAssets("", 5);
    expect(res.length).toBe(5);
  });

  it("ranks exact ticker first, then prefix, then name", () => {
    const res = searchLocalAssets("AAP");
    expect(res[0].symbol).toBe("AAPL");
  });

  it("matches by company name", () => {
    const res = searchLocalAssets("bitcoin");
    expect(res.some((a) => a.symbol === "BTC")).toBe(true);
  });

  it("finds ASX tickers", () => {
    const res = searchLocalAssets("BHP");
    expect(res[0].symbol).toBe("BHP.AX");
  });

  it("respects the limit", () => {
    expect(searchLocalAssets("A", 3).length).toBeLessThanOrEqual(3);
  });
});

describe("mergeAssetResults", () => {
  it("de-dupes by symbol, preferring local order", () => {
    const local: Asset[] = [{ symbol: "AAPL", name: "Apple", market: "US", kind: "STOCK" }];
    const live: Asset[] = [
      { symbol: "AAPL", name: "Apple Inc", market: "US", kind: "STOCK" },
      { symbol: "TSLA", name: "Tesla", market: "US", kind: "STOCK" },
    ];
    const merged = mergeAssetResults(local, live, 10);
    expect(merged.map((a) => a.symbol)).toEqual(["AAPL", "TSLA"]);
    expect(merged[0].name).toBe("Apple"); // local preferred
  });

  it("caps to the limit", () => {
    const live: Asset[] = Array.from({ length: 30 }, (_, i) => ({
      symbol: `S${i}`, name: `Name ${i}`, market: "US" as const, kind: "STOCK" as const,
    }));
    expect(mergeAssetResults([], live, 8).length).toBe(8);
  });
});

describe("getAsset", () => {
  it("looks up curated metadata case-insensitively", () => {
    expect(getAsset("btc")?.name).toBe("Bitcoin");
    expect(getAsset("ZZZ_UNKNOWN")).toBeUndefined();
  });
});
