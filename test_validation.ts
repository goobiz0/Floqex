import { getIntradayBars } from "./src/lib/engine/market-data";
import { runValidation, DEFAULT_COSTS } from "./src/lib/engine/validation";

async function testParams() {
  const { bars, days, source } = await getIntradayBars("NQ", "5m", 58);
  console.log(`Loaded ${bars.length} bars over ${days} days from ${source}`);

  const candidates = [
    { name: "Classic ORB", riskPct: 1, rrTarget: 2, stopLossPct: 0.5, trendFilter: false, minRange: 0.1, maxRange: 5, direction: "BOTH" },
    { name: "Trend Filtered ORB", riskPct: 1, rrTarget: 2, stopLossPct: 0.5, trendFilter: true, minRange: 0.1, maxRange: 5, direction: "BOTH" },
    { name: "Aggressive Wide Stop", riskPct: 1, rrTarget: 1.5, stopLossPct: 1, trendFilter: true, minRange: 0.1, maxRange: 3, direction: "BOTH" },
    { name: "Conservative", riskPct: 0.5, rrTarget: 1.2, stopLossPct: 0.4, trendFilter: true, minRange: 0.1, maxRange: 2.5, direction: "BOTH" },
    { name: "High RR", riskPct: 1, rrTarget: 3, stopLossPct: 0.3, trendFilter: false, minRange: 0.2, maxRange: 4, direction: "BOTH" },
    { name: "Short bias", riskPct: 1, rrTarget: 2, stopLossPct: 0.5, trendFilter: false, minRange: 0.1, maxRange: 5, direction: "SHORT" },
    { name: "Long bias", riskPct: 1, rrTarget: 2, stopLossPct: 0.5, trendFilter: false, minRange: 0.1, maxRange: 5, direction: "LONG" },
    { name: "Trend + Long bias", riskPct: 1, rrTarget: 2, stopLossPct: 0.5, trendFilter: true, minRange: 0.1, maxRange: 5, direction: "LONG" },
  ];

  for (const c of candidates) {
    const report = runValidation(
      bars,
      { ...c } as any,
      DEFAULT_COSTS,
      { interval: "5m", intervalMinutes: 5, source, seed: 7 }
    );
    console.log(`\n--- ${c.name} ---`);
    console.log(`Edge Score: ${report.edge.score} (${report.edge.verdict})`);
    console.log(`In-Sample Return: ${report.walkForward.inSample.totalReturnPct.toFixed(2)}% (Win Rate: ${report.walkForward.inSample.winRate.toFixed(1)}%)`);
    console.log(`Out-of-Sample Return: ${report.walkForward.outOfSample.totalReturnPct.toFixed(2)}% (Win Rate: ${report.walkForward.outOfSample.winRate.toFixed(1)}%)`);
    console.log(`OOS Expectancy (R): ${report.walkForward.outOfSample.expectancyR.toFixed(2)}`);
  }
}

testParams().catch(console.error);
