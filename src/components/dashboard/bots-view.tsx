"use client";

import { useTransition, useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Flask, DotsThree, LinkBreak, Sliders, Trash, Info, ShareNetwork, Warning, Copy } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import { toggleBotStatus } from "@/app/dashboard/accounts/actions";
import { detachBot, connectBotToAccount, deleteBot, toggleBotPublic, resumeEdgeDecay, updateBotEdgeDecayThreshold } from "@/app/dashboard/bots/actions";
import { PLANS, formatAccountLimit, type Plan } from "@/lib/plans";
import { dashboardUrl } from "@/lib/urls";
import type { BotRow, AvailableAccount } from "@/lib/queries";
import { EdgeDecayChart } from "@/components/dashboard/edge-decay-chart";

const STATUS: Record<BotRow["status"] | "NONE", { tone: "positive" | "warning" | "neutral" | "negative"; label: string }> = {
  RUNNING: { tone: "positive", label: "Running" },
  WAITING: { tone: "warning", label: "Waiting" },
  STOPPED: { tone: "neutral", label: "Stopped" },
  NONE: { tone: "negative", label: "Inactive - No Account" },
};

export function BotsView({ bots, availableAccounts, plan }: { bots: BotRow[]; availableAccounts: AvailableAccount[]; plan: Plan }) {
  const cfg = PLANS[plan];
  const atLimit = bots.length >= (cfg.accountLimit ?? 999);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-fg-subtle">
            <span className="tnum font-medium text-fg">{bots.length}</span> of{" "}
            {formatAccountLimit(cfg.accountLimit)} bot{bots.length === 1 ? "" : "s"}
          </p>
          {plan === "FREE" && <span title="Upgrade to create more bots."><Badge tone="positive">PRO</Badge></span>}
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
          {bots.map((b) => (
            <BotCard key={b.id} bot={b} availableAccounts={availableAccounts} />
          ))}
        </div>
      )}
    </div>
  );
}

function BotCard({ bot, availableAccounts }: { bot: BotRow; availableAccounts: AvailableAccount[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<BotRow["status"] | "NONE", BotRow["status"] | "NONE">(
    bot.accountId ? bot.status : "NONE",
    (_state, newStatus) => newStatus
  );

  const status = STATUS[optimisticStatus];
  const isRunning = optimisticStatus === "RUNNING";
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

  return (
    <Card className={cn("flex h-full flex-col p-5 relative overflow-hidden", !bot.accountId && "opacity-80 border-dashed")}>
      {bot.edgeDecayPaused && (
        <div className="absolute top-0 left-0 right-0 bg-negative-soft border-b border-negative/20 px-4 py-2 flex items-center justify-between">
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
      
      <div className={cn("flex items-start justify-between", bot.edgeDecayPaused && "mt-8")}>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-fg">{bot.name}</p>
            {bot.accountId && (
              <Badge tone={bot.accountMode === "LIVE" ? "warning" : "neutral"}>
                {bot.accountMode === "LIVE" ? "Live" : "Paper"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-fg-subtle mt-1 flex items-center gap-1">
            {bot.accountId ? `${bot.accountBroker} · ` : ""} 
            {bot.strategyName}
            <span title="The underlying strategy this bot runs" className="cursor-help"><Info size={12} /></span>
          </p>
        </div>
        
        <Dropdown
          trigger={
            <button className="text-fg-subtle hover:text-fg transition-colors p-1 rounded hover:bg-surface-hover">
              <DotsThree size={20} weight="bold" />
            </button>
          }
          align="right"
          items={[
            {
              label: "Tune Strategy",
              icon: <Sliders size={16} />,
              onClick: () => {
                router.push(`/dashboard/strategy?view=edit&strategyId=${bot.strategyId}${bot.accountId ? `&accountId=${bot.accountId}` : ''}`);
              }
            },
            {
              label: bot.isPublic ? "Make Bot Private" : "Share Bot (Public Embed)",
              icon: <ShareNetwork size={16} />,
              onClick: () => {
                startTransition(async () => {
                  await toggleBotPublic(bot.id, !bot.isPublic);
                });
              }
            },
            ...(bot.accountId ? [
              { label: "divider" as const, onClick: () => {} },
              {
                label: "Detach Bot",
                icon: <LinkBreak size={16} />,
                onClick: () => {
                  if (confirm("Are you sure you want to detach this bot? The account will stop trading automatically.")) {
                    startTransition(async () => {
                      await detachBot(bot.id);
                    });
                  }
                }
              }
            ] : []),
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
              }
            }
          ]}
        />
      </div>

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
                <DisplayValue type="PNL" money={bot.todayPnl ?? 0} percent={bot.balance ? ((bot.todayPnl ?? 0) / bot.balance) * 100 : undefined} />
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Spark data={bot.spark} />
          </div>
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
               items={availableAccounts.map(a => ({
                 label: `${a.nickname} (${a.broker})`,
                 onClick: () => connectAccount(a.id)
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
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <StatusDot tone={status.tone} pulse={isRunning} />
          {status.label}
        </span>
        {bot.accountId && (
          <Button
            size="sm"
            variant={isRunning ? "secondary" : "primary"}
            disabled={pending || bot.edgeDecayPaused}
            onClick={toggle}
          >
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
  );
}

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-10 items-center text-xs text-fg-faint">No history yet</div>
    );
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
