// Pure forward-test evaluation. Kept free of prisma so it is trivially testable.
// A forward test asks one question: once the strategy trades live paper, does the
// edge that showed up in validation actually hold? The gate only opens when it
// does.

export type ForwardObserved = { trades: number; winRate: number; expectancyR: number };
export type ForwardBaseline = { winRate: number | null; expectancyR: number | null };
export type ForwardEvaluation = {
  status: "RUNNING" | "PASSED" | "FAILED";
  progress: number; // 0..1 toward targetTrades
  reason: string;
};

// A passing forward test must keep at least this share of the validated edge.
const KEEP_TOLERANCE = 0.5;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function evaluateForwardTest(observed: ForwardObserved, baseline: ForwardBaseline, targetTrades: number): ForwardEvaluation {
  const target = Math.max(1, targetTrades);
  const progress = clamp01(observed.trades / target);

  if (observed.trades < target) {
    return { status: "RUNNING", progress, reason: `${observed.trades} of ${target} paper trades logged.` };
  }

  if (observed.expectancyR <= 0) {
    return { status: "FAILED", progress, reason: `Live paper expectancy is ${observed.expectancyR.toFixed(2)}R. No edge to promote.` };
  }

  if (baseline.expectancyR != null && baseline.expectancyR > 0) {
    const kept = observed.expectancyR / baseline.expectancyR;
    if (kept < KEEP_TOLERANCE) {
      return {
        status: "FAILED",
        progress,
        reason: `Live paper kept only ${Math.round(kept * 100)}% of the validated ${baseline.expectancyR.toFixed(2)}R edge.`,
      };
    }
    return {
      status: "PASSED",
      progress,
      reason: `Edge held: ${observed.expectancyR.toFixed(2)}R live vs ${baseline.expectancyR.toFixed(2)}R expected over ${observed.trades} trades.`,
    };
  }

  return {
    status: "PASSED",
    progress,
    reason: `Positive ${observed.expectancyR.toFixed(2)}R expectancy confirmed over ${observed.trades} paper trades.`,
  };
}
