"use client";

import { useTransition, useOptimistic, useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Plus,
  Flask,
  DotsThree,
  LinkBreak,
  Sliders,
  Trash,
  Info,
  TestTube,
  ArrowCircleUp,
  StopCircle,
  CheckCircle,
  XCircle,
  HourglassMedium,
  ChartLineUp,
  Warning,
  Copy,
  Plug,
  CircleNotch,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import { EdgeDecayChart } from "@/components/dashboard/edge-decay-chart";
import { BotAssetsEditor } from "@/components/dashboard/bot-assets-editor";
import { toggleBotStatus } from "@/app/dashboard/accounts/actions";
import { detachBot, connectBotToAccount, deleteBot, startForwardTest, stopForwardTest, resumeEdgeDecay, updateBotEdgeDecayThreshold } from "@/app/dashboard/bots/actions";
import { PLANS, formatAccountLimit, type Plan } from "@/lib/plans";
import { dashboardUrl } from "@/lib/urls";
import type { BotRow, AvailableAccount, ForwardTestRow } from "@/lib/queries";

const STATUS: Record<BotRow["status"] | "NONE", { tone: "positive" | "warning" | "neutral" | "negative"; label: string }> = {
  RUNNING: { tone: "positive", label: "Running" },
  WAITING: { tone: "warning", label: "Waiting" },
  STOPPED: { tone: "neutral", label: "Stopped" },
  NONE: { tone: "negative", label: "Inactive - No Account" },
};

const FT_STATUS: Record<ForwardTestRow["status"], { tone: "positive" | "warning" | "neutral" | "negative"; label: string }> = {
  RUNNING: { tone: "warning", label: "Running" },
  PASSED: { tone: "positive", label: "Passed" },
  FAILED: { tone: "negative", label: "Failed" },
  STOPPED: { tone: "neutral", label: "Stopped" },
};

export function BotsView({
  bots,
  availableAccounts,
  plan,
  forwardTests,
}: {
  bots: BotRow[];
  availableAccounts: AvailableAccount[];
  plan: Plan;
  forwardTests: ForwardTestRow[];
}) {
  const cfg = PLANS[plan];
  const atLimit = bots.length >= (cfg.accountLimit ?? 999);

  // Index forward tests by accountId for O(1) lookup
  const ftByAccount = new Map<string, ForwardTestRow>();
  for (const ft of forwardTests) {
    // Keep most-recent per account (already ordered by startedAt desc from getForwardTests)
    if (!ftByAccount.has(ft.accountId)) ftByAccount.set(ft.accountId, ft);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-fg-subtle">
            <span className="tnum font-medium text-fg">{bots.length}</span> of{" "}
            {formatAccountLimit(cfg.accountLimit)} bot{bots.length === 1 ? "" : "s"}
          </p>
          {plan === "FREE" && (
            <span title="Upgrade to create more bots.">
              <Badge tone="positive">PRO</Badge>
            </span>
          )}
        </div>
        {atLimit ? (
          <Button size="sm" disabled>
            <Plus weight="bold" />
            New Bot
          </Button>
        ) : (
          <Button href={dashboardUrl("/bots/new")} size="sm">
            <Plus weight="bold" />
            New Bot
          </Button>
        )}
      </div>

      {bots.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface mb-4">
            <Flask className="text-fg-subtle" size={24} />
          </div>
          <h3 className="text-lg font-medium text-fg">No bots active</h3>
          <p className="mt-1 text-sm text-fg-subtle max-w-[250px]">
            Deploy your first strategy to start automating your trades.
          </p>
          {atLimit ? (
            <Button className="mt-6" disabled>
              Create Bot
            </Button>
          ) : (
            <Button href={dashboardUrl("/bots/new")} className="mt-6">
              Create Bot
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {bots.map((b, index) => (
            <BotCard
              key={b.id}
              bot={b}
              availableAccounts={availableAccounts}
              forwardTest={b.accountId ? (ftByAccount.get(b.accountId) ?? null) : null}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BotCard({
  bot,
  availableAccounts,
  forwardTest,
  index = 0,
}: {
  bot: BotRow;
  availableAccounts: AvailableAccount[];
  forwardTest: ForwardTestRow | null;
  index?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<BotRow["status"] | "NONE", BotRow["status"] | "NONE">(
    bot.accountId ? bot.status : "NONE",
    (_state, newStatus) => newStatus,
  );
  const [ftPending, startFtTransition] = useTransition();
  const [ftError, setFtError] = useState<string | null>(null);

  // While a forward test is live, refresh server data on an interval so its
  // observed trades and progress advance without a manual reload.
  useEffect(() => {
    if (forwardTest?.status !== "RUNNING") return;
    const id = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(id);
  }, [forwardTest?.status, router]);

  const status = STATUS[optimisticStatus];
  const isRunning = optimisticStatus === "RUNNING";
  const isPaper = bot.accountMode === "PAPER";
  const pnlTone =
    (bot.todayPnl ?? 0) > 0 ? "text-profit" : (bot.todayPnl ?? 0) < 0 ? "text-negative" : "text-fg-muted";

  function toggle() {
    if (!bot.accountId) return;
    startTransition(async () => {
      setOptimisticStatus(isRunning ? "STOPPED" : "RUNNING");
      const res = await toggleBotStatus(bot.accountId!);
      if (!res.ok) alert(res.error);
    });
  }

  function connectAccount(accountId: string) {
    startTransition(async () => {
      const res = await connectBotToAccount(bot.id, accountId);
      if (!res.ok) alert(res.error);
    });
  }

  function handleStartForwardTest() {
    setFtError(null);
    startFtTransition(async () => {
      const res = await startForwardTest(bot.id);
      if (!res.ok) setFtError(res.error ?? "Failed to start forward test");
    });
  }

  function handleStopForwardTest() {
    if (!forwardTest) return;
    startFtTransition(async () => {
      const res = await stopForwardTest(forwardTest.id);
      if (!res.ok) setFtError(res.error ?? "Failed to stop forward test");
    });
  }

  return (
    <div style={{ "--stagger-index": index } as React.CSSProperties} className="stagger-in h-full">
      <Card 
        className={cn("flex h-full flex-col p-5 relative transition-gpu lift", !bot.accountId && "opacity-80 border-dashed")} 
      >
        {bot.edgeDecayPaused && (
        <div className="absolute top-0 left-0 right-0 bg-negative-soft border-b border-negative/20 px-4 py-2 flex items-center justify-between rounded-t-[inherit]">
           <div className="flex items-center gap-2 text-negative text-xs font-medium">
             <Warning size={16} weight="bold" />
             Edge Decay Detected — Bot Paused
           </div>
           <Button size="sm" variant="secondary" className="h-6 px-2 text-[10px]" onClick={() => {
             startTransition(async () => {
               await resumeEdgeDecay(bot.id);
             });
           }}>
             Resume
           </Button>
        </div>
      )}
      
      <div className={cn("flex items-start justify-between gap-2", bot.edgeDecayPaused && "mt-8")}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="truncate font-medium text-fg">{bot.name}</p>
            {bot.accountId && (
              <Badge tone={bot.accountMode === "LIVE" ? "warning" : "neutral"} className="shrink-0">
                {bot.accountMode === "LIVE" ? "Live" : "Paper"}
              </Badge>
            )}
          </div>

          {/* Connected account, named so this bot is identifiable among many */}
          {bot.accountId ? (
            <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 min-w-0">
              <Plug size={12} weight="bold" className="shrink-0 text-accent" />
              <span
                className="truncate text-xs font-medium text-fg"
                title={bot.accountNickname ?? undefined}
              >
                {bot.accountNickname}
              </span>
              {bot.accountBroker && (
                <>
                  <span className="text-fg-faint shrink-0">·</span>
                  <span className="shrink-0 text-xs text-fg-muted">{bot.accountBroker}</span>
                </>
              )}
            </span>
          ) : (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-fg-subtle min-w-0">
              <LinkBreak size={12} className="shrink-0" />
              No account connected
            </span>
          )}

          {/* Underlying strategy */}
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-fg-subtle min-w-0">
            <span className="text-fg-faint shrink-0">Strategy</span>
            <span className="truncate text-fg-muted">{bot.strategyName}</span>
            <span title="The underlying strategy this bot runs" className="shrink-0 cursor-help">
              <Info size={12} />
            </span>
          </p>
        </div>

        <Dropdown
          trigger={
            <button type="button" className="text-fg-subtle hover:text-fg transition-colors p-1 rounded hover:bg-surface-hover">
              <DotsThree size={20} weight="bold" />
            </button>
          }
          align="right"
          items={[
            {
              label: "Tune Strategy",
              icon: <Sliders size={16} />,
              onClick: () => {
                router.push(
                  `/dashboard/strategy?view=edit&strategyId=${bot.strategyId}${bot.accountId ? `&accountId=${bot.accountId}` : ""}`,
                );
              },
            },
            ...(bot.accountId
              ? [
                  { label: "divider" as const, onClick: () => {} },
                  {
                    label: "Detach Bot",
                    icon: <LinkBreak size={16} />,
                    onClick: () => {
                      if (
                        confirm(
                          "Are you sure you want to detach this bot? The account will stop trading automatically.",
                        )
                      ) {
                        startTransition(async () => {
                          await detachBot(bot.id);
                        });
                      }
                    },
                  },
                ]
              : []),
            { label: "divider" as const, onClick: () => {} },
            {
              label: "Delete Bot",
              icon: <Trash size={16} className="text-negative" />,
              onClick: () => {
                if (confirm("Are you sure you want to delete this bot forever?")) {
                  startTransition(async () => {
                    await deleteBot(bot.id);
                  });
                }
              },
            },
          ]}
        />
      </div>

      {/* Assets this bot trades (a property of the bot, editable in place) */}
      <BotAssetsEditor botId={bot.id} instruments={bot.instruments} />

      {bot.accountId ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-fg-subtle">Balance</p>
              <p className="tnum mt-0.5 text-lg font-semibold text-fg">
                <DisplayValue type="BALANCE" money={bot.balance ?? 0} />
              </p>
            </div>
            <div>
              <p className="text-xs text-fg-subtle">Today</p>
              <p className={cn("tnum mt-0.5 text-lg font-semibold", pnlTone)}>
                <DisplayValue
                  type="PNL"
                  money={bot.todayPnl ?? 0}
                  percent={bot.balance ? ((bot.todayPnl ?? 0) / (bot.balance - (bot.todayPnl ?? 0))) * 100 : undefined}
                />
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Spark data={bot.spark} />
          </div>

          {/* Forward-Test Promotion Gate */}
          {isPaper && (
            <ForwardTestCard
              forwardTest={forwardTest}
              ftPending={ftPending}
              ftError={ftError}
              onStart={handleStartForwardTest}
              onStop={handleStopForwardTest}
            />
          )}
        </>
      ) : (
        <div className="mt-6 mb-2 flex-1 flex flex-col items-center justify-center py-6 bg-surface-hover/30 rounded-lg border border-line">
          <p className="text-sm font-medium text-fg-muted mb-2">Bot is disconnected</p>

          {availableAccounts.length > 0 ? (
            <Dropdown
              trigger={
                <Button size="sm" variant="outline">
                  Connect Account
                </Button>
              }
              align="right"
              items={availableAccounts.map((a) => ({
                label: `${a.nickname} (${a.broker})`,
                onClick: () => connectAccount(a.id),
              }))}
            />
          ) : (
            <Button size="sm" variant="outline" disabled title="No available accounts without a bot">
              Connect Account
            </Button>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted relative">
          <StatusDot tone={status.tone} pulse={isRunning} />
          <span className="transition-all duration-200 ease-out">{status.label}</span>
        </span>
        {bot.accountId && (
          <Button size="sm" variant={isRunning ? "secondary" : "primary"} disabled={pending} onClick={toggle}>
            {isRunning ? "Stop" : "Start"}
          </Button>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-4">
         <p className="text-xs font-medium text-fg-subtle mb-2">Edge Decay Protection</p>
         {bot.spark && bot.spark.length > 0 && (
           <div className="mb-4 rounded-[var(--radius-card)] overflow-hidden border border-line bg-surface/50">
             <EdgeDecayChart data={bot.spark} />
           </div>
         )}
         <div className="flex items-center gap-2">
            <span className="text-[11px] text-fg-muted">Pause bot if win-rate drops by:</span>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              max="1.0"
              defaultValue={bot.edgeDecayThreshold ?? 0.20}
              className="h-7 w-20 rounded-[var(--radius-control)] border border-line bg-surface px-2 text-xs text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              onBlur={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                startTransition(async () => {
                  await updateBotEdgeDecayThreshold(bot.id, val);
                  toast.success("Edge decay threshold updated.");
                });
              }}
            />
         </div>
      </div>

      {bot.isPublic && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-xs font-medium text-fg-subtle mb-1 flex items-center justify-between">
            Public Embed URL
            <Badge tone="positive">LIVE</Badge>
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[8px] bg-surface px-2 py-1.5 text-[11px] text-fg-muted border border-line">
              {typeof window !== "undefined" ? window.location.origin : ""}/embed/bot/{bot.id}
            </code>
            <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/embed/bot/${bot.id}`);
              alert("Public embed URL copied!");
            }}>
              <Copy size={14} />
            </Button>
          </div>
        </div>
      )}
    </Card>
    </div>
  );
}

function ForwardTestCard({
  forwardTest: ft,
  ftPending,
  ftError,
  onStart,
  onStop,
}: {
  forwardTest: ForwardTestRow | null;
  ftPending: boolean;
  ftError: string | null;
  onStart: () => void;
  onStop: () => void;
}) {
  const active = ft?.status === "RUNNING";

  // Live "running for Xs/Xm" readout so an in-progress test visibly advances.
  // Updated only from timer callbacks (never synchronously in the effect) and
  // filled in on the client, which also avoids an SSR/hydration time mismatch.
  const [elapsed, setElapsed] = useState<string | null>(null);
  const startedAt = ft?.startedAt;
  useEffect(() => {
    if (!active || !startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const secs = Math.max(0, Math.round((Date.now() - start) / 1000));
      let label: string;
      if (secs < 60) label = `${secs}s`;
      else {
        const mins = Math.floor(secs / 60);
        if (mins < 60) label = `${mins}m`;
        else {
          const hrs = Math.floor(mins / 60);
          label = hrs < 24 ? `${hrs}h ${mins % 60}m` : `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
        }
      }
      setElapsed(label);
    };
    const kick = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(kick);
      clearInterval(id);
    };
  }, [active, startedAt]);

  // No forward test yet — invite the user to start one
  if (!ft) {
    return (
      <div className="mt-4 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-2 mb-2">
          <TestTube size={15} className="text-fg-subtle" />
          <p className="text-xs font-medium text-fg-subtle uppercase tracking-wide">Forward Test</p>
        </div>
        <p className="text-xs text-fg-muted mb-3">
          Prove this strategy in live paper trading before risking real capital. The gate opens only when your edge
          holds.
        </p>
        {ftError && <p className="text-xs text-negative mb-2">{ftError}</p>}
        <Button size="sm" variant="outline" onClick={onStart} disabled={ftPending}>
          {ftPending ? <CircleNotch size={14} className="animate-spin" /> : <TestTube size={14} />}
          {ftPending ? "Starting..." : "Start Forward Test"}
        </Button>
      </div>
    );
  }

  const ftMeta = FT_STATUS[ft.status];
  const pct = Math.round(ft.progress * 100);
  const passed = ft.status === "PASSED";
  const failed = ft.status === "FAILED";
  const stopped = ft.status === "STOPPED";

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border p-4 transition-colors",
        passed && "border-accent/30 bg-accent/5",
        failed && "border-negative/30 bg-negative/5",
        stopped && "border-line bg-surface",
        active && "border-accent/20 bg-surface",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChartLineUp size={15} className={cn("text-fg-subtle", (passed || active) && "text-accent")} />
          <p className="text-xs font-medium text-fg-subtle uppercase tracking-wide">Forward Test</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={ftMeta.tone}>
            {active && <StatusDot tone="warning" pulse />}
            {ftMeta.label}
          </Badge>
          {active && (
            <button
              type="button"
              onClick={onStop}
              disabled={ftPending}
              title="Stop forward test"
              className="text-fg-subtle transition-colors hover:text-fg disabled:opacity-50"
            >
              {ftPending ? <CircleNotch size={15} className="animate-spin" /> : <StopCircle size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar: an indeterminate sheen sweeps across it while running */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-fg-muted mb-1">
          <span className="tnum">{ft.observedTrades} trades</span>
          <span className="tnum">target {ft.targetTrades}</span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-hover">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              passed ? "bg-accent" : failed ? "bg-negative" : "bg-accent/60",
            )}
            style={{ width: `${pct}%` }}
          />
          {active && (
            <div className="ft-sweep pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[10px] text-fg-faint tnum">{pct}% complete</p>
          {active && elapsed && (
            <p className="text-[10px] text-fg-faint tnum">running for {elapsed}</p>
          )}
        </div>
      </div>

      {/* Observed vs baseline metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-fg-muted uppercase tracking-wide">Live Expectancy</p>
          <p
            className={cn(
              "tnum text-sm font-semibold mt-0.5",
              ft.observedExpectancyR > 0 ? "text-profit" : "text-negative",
            )}
          >
            {ft.observedExpectancyR > 0 ? "+" : ""}
            {ft.observedExpectancyR.toFixed(2)}R
          </p>
          {ft.baselineExpectancy != null && (
            <p className="text-[10px] text-fg-faint tnum">baseline {ft.baselineExpectancy.toFixed(2)}R</p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-fg-muted uppercase tracking-wide">Win Rate</p>
          <p className="tnum text-sm font-semibold mt-0.5 text-fg">{ft.observedWinRate.toFixed(1)}%</p>
          <p className="text-[10px] text-fg-faint tnum">{ft.observedTrades} closed</p>
        </div>
      </div>

      {/* Reason / verdict line */}
      <p className="text-[10px] text-fg-muted leading-relaxed mb-3">{ft.reason}</p>

      {ftError && <p className="text-xs text-negative mb-2">{ftError}</p>}

      {/* Action: Promote to live (only on PASSED) or restart on FAILED/STOPPED */}
      {passed && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-accent/10 border border-accent/20">
          <CheckCircle size={14} className="text-accent shrink-0" />
          <p className="text-xs text-accent font-medium flex-1">Edge confirmed. Ready to promote.</p>
          <Button
            size="sm"
            variant="primary"
            href={`/dashboard/bots/new?strategyId=${ft.strategyId}&fromForwardTest=${ft.id}`}
          >
            <ArrowCircleUp size={14} />
            Promote
          </Button>
        </div>
      )}
      {failed && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-negative/10 border border-negative/20">
          <XCircle size={14} className="text-negative shrink-0" />
          <p className="text-xs text-negative font-medium flex-1">Edge did not hold.</p>
          <Button size="sm" variant="outline" onClick={onStart} disabled={ftPending}>
            {ftPending && <CircleNotch size={14} className="animate-spin" />}
            Retry
          </Button>
        </div>
      )}
      {stopped && (
        <Button size="sm" variant="outline" onClick={onStart} disabled={ftPending}>
          {ftPending ? <CircleNotch size={14} className="animate-spin" /> : <HourglassMedium size={14} />}
          {ftPending ? "Restarting..." : "Restart Test"}
        </Button>
      )}
    </div>
  );
}

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) {
    return <div className="flex h-10 items-center text-xs text-fg-faint">No history yet</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 28 - ((v - min) / range) * 26;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={up ? "var(--color-profit)" : "var(--color-negative)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
