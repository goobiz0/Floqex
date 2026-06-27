import { Card, CardTitle } from "@/components/ui/card";
import { Histogram } from "@/components/dashboard/charts";
import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";
import type { ExecutionQuality } from "@/lib/metrics";

// Render-only. Proves the bot fills what it intends, how fast, and stays up.
export function ExecutionQualitySection({ q }: { q: ExecutionQuality }) {
  if (q.fills === 0 && q.runningBots === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <CardTitle>Execution quality</CardTitle>
          <InfoTip text="Once the bot fills trades, this shows slippage (intended vs actual price), routing latency, uptime and missed signals." />
        </div>
        <p className="mt-4 text-sm text-fg-subtle">
          No fills yet. Your execution stats appear here once the bot trades.
        </p>
      </Card>
    );
  }

  const scoreTone = q.fillQualityScore >= 80 ? "positive" : q.fillQualityScore >= 55 ? "warning" : "negative";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Execution quality</CardTitle>
          <InfoTip text="Slippage is the gap between the price the strategy intended and the price actually filled, in basis points (positive = worse). Tighter fills, low latency and high uptime mean automation is faithful to your backtest." />
        </div>
        <Badge tone={scoreTone} mono>Fill quality {q.fillQualityScore}/100</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Avg slippage" value={`${q.avgEntrySlippageBps >= 0 ? "+" : ""}${q.avgEntrySlippageBps} bps`} tone={q.avgEntrySlippageBps <= 3 ? "pos" : q.avgEntrySlippageBps <= 8 ? "neutral" : "neg"} sub={`median ${q.medianEntrySlippageBps} bps`} />
        <Stat label="Avg latency" value={q.avgLatencyMs > 0 ? `${q.avgLatencyMs} ms` : "instant"} tone="neutral" sub={`${q.fills} fills`} />
        <Stat label="Bot uptime" value={`${q.uptimePct}%`} tone={q.uptimePct >= 99 ? "pos" : q.uptimePct >= 90 ? "neutral" : "neg"} sub={`${q.liveBots}/${q.runningBots} live`} />
        <Stat label="Missed signals" value={String(q.missedSignals)} tone={q.missedSignals === 0 ? "pos" : "neutral"} sub="blocked by risk" />
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Entry slippage distribution</p>
          <InfoTip text="How fills landed relative to the intended price. A left-heavy distribution (better fills, tight bands) is healthy." />
        </div>
        <div className="mt-4">
          <Histogram data={q.slippageBuckets} />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "pos" | "neg" | "neutral" }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className={cn("mt-0.5 tnum text-lg font-bold", tone === "pos" && "text-positive", tone === "neg" && "text-negative", tone === "neutral" && "text-fg")}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-fg-faint">{sub}</p>}
    </div>
  );
}
