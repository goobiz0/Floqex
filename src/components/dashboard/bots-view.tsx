"use client";

import { useTransition, useOptimistic } from "react";
import Link from "next/link";
import { Plus, Flask } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import { toggleBotStatus } from "@/app/dashboard/accounts/actions";
import { PLANS, formatAccountLimit, type Plan } from "@/lib/plans";
import { dashboardUrl } from "@/lib/urls";
import type { BotRow } from "@/lib/queries";

const STATUS: Record<BotRow["status"], { tone: "positive" | "warning" | "neutral"; label: string }> = {
  RUNNING: { tone: "positive", label: "Running" },
  WAITING: { tone: "warning", label: "Waiting" },
  STOPPED: { tone: "neutral", label: "Stopped" },
  NONE: { tone: "neutral", label: "No bot" },
};

export function BotsView({ bots, plan }: { bots: BotRow[]; plan: Plan }) {
  const cfg = PLANS[plan];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-subtle">
          <span className="tnum font-medium text-fg">{bots.length}</span> of{" "}
          {formatAccountLimit(cfg.accountLimit)} bot{bots.length === 1 ? "" : "s"}
        </p>
        {bots.length >= (cfg.accountLimit ?? 999) ? (
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
          {bots.length >= (cfg.accountLimit ?? 999) ? (
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
            <BotCard key={b.accountId} bot={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BotCard({ bot }: { bot: BotRow }) {
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<BotRow["status"], BotRow["status"]>(
    bot.status,
    (_state, newStatus) => newStatus
  );

  const status = STATUS[optimisticStatus];
  const isRunning = optimisticStatus === "RUNNING";
  const pnlTone =
    bot.todayPnl > 0 ? "text-profit" : bot.todayPnl < 0 ? "text-negative" : "text-fg-muted";

  function toggle() {
    startTransition(async () => {
      setOptimisticStatus(isRunning ? "STOPPED" : "RUNNING");
      const res = await toggleBotStatus(bot.accountId);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-fg">{bot.nickname}</p>
          <p className="text-xs text-fg-subtle">
            {bot.broker} · {bot.strategyName ?? "No strategy"}
          </p>
        </div>
        <Badge tone={bot.mode === "LIVE" ? "warning" : "neutral"}>
          {bot.mode === "LIVE" ? "Live" : "Paper"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-fg-subtle">Balance</p>
          <p className="tnum mt-0.5 text-lg font-semibold text-fg"><DisplayValue type="BALANCE" money={bot.balance} /></p>
        </div>
        <div>
          <p className="text-xs text-fg-subtle">Today</p>
          <p className={cn("tnum mt-0.5 text-lg font-semibold", pnlTone)}>
            <DisplayValue type="PNL" money={bot.todayPnl} percent={bot.balance ? (bot.todayPnl / bot.balance) * 100 : undefined} />
          </p>
        </div>
      </div>

      <div className="mt-3">
        <Spark data={bot.spark} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <StatusDot tone={status.tone} pulse={isRunning} />
          {status.label}
        </span>
        {bot.botId ? (
          <Button
            size="sm"
            variant={isRunning ? "secondary" : "primary"}
            disabled={pending}
            onClick={toggle}
          >
            {isRunning ? "Stop" : "Start"}
          </Button>
        ) : (
          <Link href={dashboardUrl("/accounts")} className="text-sm font-medium text-accent hover:text-accent-hover">
            Attach a bot
          </Link>
        )}
      </div>
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
