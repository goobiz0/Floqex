import { getIntradayBars } from "./src/lib/engine/market-data";
import { runValidation, DEFAULT_COSTS } from "./src/lib/engine/validation";

async function testParams() {
  const nq = await getIntradayBars("NQ", "5m", 58);
  const spy = await getIntradayBars("ES", "5m", 58).catch(() => getIntradayBars("SPY", "5m", 58));

  const bests = [];

  for (const minRange of [0.1, 0.5]) {
      for (const rrTarget of [1, 2, 3]) {
        for (const stopLossPct of [0.5, 1, 2]) {
          for (const trendFilter of [true, false]) {
              const params = { riskPct: 1, rrTarget, stopLossPct, trendFilter, minRange, maxRange: 5, direction: "BOTH" };
              const rep1 = runValidation(nq.bars, params as any, DEFAULT_COSTS, { interval: "5m", intervalMinutes: 5, source: nq.source, seed: 7 });
              const rep2 = runValidation(spy.bars, params as any, DEFAULT_COSTS, { interval: "5m", intervalMinutes: 5, source: spy.source, seed: 7 });
              
              const avgScore = (rep1.edge.score + rep2.edge.score) / 2;
              bests.push({ score: avgScore, nqScore: rep1.edge.score, spyScore: rep2.edge.score, ...params });
          }
        }
      }
  }
  
  bests.sort((a, b) => b.score - a.score);
  console.log("Top 10:");
  console.log(bests.slice(0, 10));
}

testParams().catch(console.error);
