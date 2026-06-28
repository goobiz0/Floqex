import { describe, it, expect } from "vitest";
import { evaluateForwardTest } from "./forward-test-eval";

describe("evaluateForwardTest", () => {
  it("stays RUNNING until the target trade count is reached", () => {
    const r = evaluateForwardTest({ trades: 8, winRate: 60, expectancyR: 0.4 }, { winRate: null, expectancyR: 0.5 }, 20);
    expect(r.status).toBe("RUNNING");
    expect(r.progress).toBeCloseTo(0.4, 5);
  });

  it("PASSES when the live edge holds against the baseline", () => {
    const r = evaluateForwardTest({ trades: 20, winRate: 55, expectancyR: 0.4 }, { winRate: 55, expectancyR: 0.5 }, 20);
    expect(r.status).toBe("PASSED");
    expect(r.progress).toBe(1);
  });

  it("FAILS when expectancy collapses below half the validated edge", () => {
    const r = evaluateForwardTest({ trades: 25, winRate: 48, expectancyR: 0.15 }, { winRate: 55, expectancyR: 0.5 }, 20);
    expect(r.status).toBe("FAILED");
  });

  it("FAILS on a negative live expectancy regardless of baseline", () => {
    const r = evaluateForwardTest({ trades: 30, winRate: 40, expectancyR: -0.2 }, { winRate: null, expectancyR: null }, 20);
    expect(r.status).toBe("FAILED");
  });

  it("PASSES on positive expectancy when there is no baseline to compare", () => {
    const r = evaluateForwardTest({ trades: 20, winRate: 58, expectancyR: 0.3 }, { winRate: null, expectancyR: null }, 20);
    expect(r.status).toBe("PASSED");
  });
});
