import { describe, it, expect } from "vitest";
import { executionQuality, type ExecRow, type HeartbeatRow } from "./metrics";

const NOW = Date.UTC(2026, 5, 27, 12, 0, 0);
const fresh = new Date(NOW - 60 * 1000).toISOString(); // 1 min ago
const stale = new Date(NOW - 60 * 60 * 1000).toISOString(); // 1 hour ago

describe("executionQuality", () => {
  it("returns a clean baseline with no fills and no bots", () => {
    const q = executionQuality([], 0, [], NOW);
    expect(q.fills).toBe(0);
    expect(q.fillQualityScore).toBe(100);
    expect(q.uptimePct).toBe(100);
    expect(q.slippageBuckets.reduce((a, b) => a + b.count, 0)).toBe(0);
  });

  it("averages slippage and latency and buckets the distribution", () => {
    const fills: ExecRow[] = [
      { entrySlippageBps: 1, exitSlippageBps: 1, entryLatencyMs: 100 },
      { entrySlippageBps: 3, exitSlippageBps: 2, entryLatencyMs: 200 },
      { entrySlippageBps: 11, exitSlippageBps: 4, entryLatencyMs: 300 },
      { entrySlippageBps: -1, exitSlippageBps: 0, entryLatencyMs: 0 },
    ];
    const q = executionQuality(fills, 5, [], NOW);
    expect(q.fills).toBe(4);
    expect(q.avgEntrySlippageBps).toBeCloseTo(3.5, 5);
    expect(q.medianEntrySlippageBps).toBeCloseTo(2, 5); // median of [-1,1,3,11] = 2
    expect(q.avgLatencyMs).toBe(150);
    expect(q.missedSignals).toBe(5);
    // buckets: one each in "Better fill", "0 to 2", "2 to 5", "10 bps +"
    const byLabel = Object.fromEntries(q.slippageBuckets.map((b) => [b.label, b.count]));
    expect(byLabel["Better fill"]).toBe(1);
    expect(byLabel["0 to 2 bps"]).toBe(1);
    expect(byLabel["2 to 5 bps"]).toBe(1);
    expect(byLabel["10 bps +"]).toBe(1);
  });

  it("scores tighter fills higher", () => {
    const tight = executionQuality([{ entrySlippageBps: 0, exitSlippageBps: 0, entryLatencyMs: 10 }], 0, [], NOW);
    const loose = executionQuality([{ entrySlippageBps: 18, exitSlippageBps: 0, entryLatencyMs: 10 }], 0, [], NOW);
    expect(tight.fillQualityScore).toBe(100);
    expect(loose.fillQualityScore).toBeLessThan(tight.fillQualityScore);
  });

  it("computes uptime from fresh vs stale heartbeats of running bots", () => {
    const hb: HeartbeatRow[] = [
      { status: "RUNNING", lastHeartbeat: fresh },
      { status: "RUNNING", lastHeartbeat: stale },
      { status: "STOPPED", lastHeartbeat: stale }, // ignored: not running
    ];
    const q = executionQuality([], 0, hb, NOW);
    expect(q.runningBots).toBe(2);
    expect(q.liveBots).toBe(1);
    expect(q.uptimePct).toBe(50);
  });
});
