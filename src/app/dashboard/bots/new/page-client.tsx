"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Robot, CaretLeft, Wallet, Sliders, TrendUp, ShieldCheck, Heartbeat } from "@phosphor-icons/react/dist/ssr";
import { createBot } from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn, formatUSD } from "@/lib/utils";
import { DEFAULT_PARAMS, PARAM_BOUNDS, PARAM_LABELS, type NumericParam } from "@/lib/strategy-schema";

type AccountProp = {
  id: string;
  nickname: string;
  broker: string;
  mode: string;
  balance: number;
};

export function BotsNewClient({ availableAccounts }: { availableAccounts: AccountProp[] }) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [strategyKind, setStrategyKind] = useState<"ORB" | "CUSTOM">("ORB");
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(false);

  function handleNumParam(key: NumericParam, value: string) {
    const num = Number(value);
    setParams(p => ({ ...p, [key]: Number.isNaN(num) ? 0 : num }));
  }

  function handleBoolParam(key: "trendFilter" | "reEntry" | "newsPause", value: boolean) {
    setParams(p => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId) {
      toast.error("Please select an account.");
      return;
    }

    setLoading(true);
    const res = await createBot({
      accountId: selectedAccountId,
      strategyName: strategyKind === "ORB" ? "Opening Range Breakout" : "Custom Alpha",
      strategyKind,
      params,
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Bot created successfully.");
      router.push("/dashboard/bots");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to create bot.");
    }
  }

  if (availableAccounts.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-12 text-center max-w-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-6 border border-line">
          <Wallet size={32} className="text-fg-subtle" weight="duotone" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-fg mb-2">No available accounts</h2>
        <p className="text-fg-subtle mb-8">
          All your connected accounts already have a bot attached, or you haven't connected any accounts yet.
        </p>
        <Link href="/dashboard/accounts/new" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 text-sm font-medium text-[var(--color-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
          Connect a Broker
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl pb-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors mb-6">
        <CaretLeft size={16} /> Back to dashboard
      </Link>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Account Selection */}
        <div className="rounded-[var(--radius-card)] border border-line bg-elevated overflow-hidden">
          <div className="p-6 border-b border-line bg-surface/50">
            <h2 className="text-lg font-semibold tracking-tight text-fg flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold">1</span>
              Target Account
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableAccounts.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAccountId(a.id)}
                className={cn(
                  "flex items-start justify-between rounded-[var(--radius-control)] border p-4 text-left transition-colors",
                  selectedAccountId === a.id ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-surface hover:border-fg-muted"
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-fg">{a.nickname}</p>
                  <p className="text-xs text-fg-subtle mt-1">{a.broker} • {a.mode}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-fg tnum">{formatUSD(a.balance)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Strategy Definition */}
        <div className="rounded-[var(--radius-card)] border border-line bg-elevated overflow-hidden">
          <div className="p-6 border-b border-line bg-surface/50">
            <h2 className="text-lg font-semibold tracking-tight text-fg flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold">2</span>
              Strategy Type
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setStrategyKind("ORB")}
              className={cn(
                "flex flex-col items-start rounded-[var(--radius-control)] border p-5 text-left transition-colors",
                strategyKind === "ORB" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-surface hover:border-fg-muted"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-[8px]", strategyKind === "ORB" ? "bg-accent/20 text-accent" : "bg-elevated border border-line")}>
                  <TrendUp size={20} weight="bold" />
                </div>
                <span className="font-semibold text-fg">Opening Range Breakout (ORB)</span>
              </div>
              <p className="text-xs text-fg-subtle leading-relaxed">
                Captures explosive momentum in the first minutes of the New York session. Highly optimized for Nasdaq (NQ) and S&P 500 (ES).
              </p>
            </button>
            <button
              type="button"
              onClick={() => setStrategyKind("CUSTOM")}
              className={cn(
                "flex flex-col items-start rounded-[var(--radius-control)] border p-5 text-left transition-colors",
                strategyKind === "CUSTOM" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-surface hover:border-fg-muted"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-[8px]", strategyKind === "CUSTOM" ? "bg-accent/20 text-accent" : "bg-elevated border border-line")}>
                  <Sliders size={20} weight="bold" />
                </div>
                <span className="font-semibold text-fg">Custom Alpha</span>
              </div>
              <p className="text-xs text-fg-subtle leading-relaxed">
                Define your own execution logic and parameters. The engine will supply market data and manage risk according to your limits.
              </p>
            </button>
          </div>
        </div>

        {/* Step 3: Parameter Configuration */}
        <div className="rounded-[var(--radius-card)] border border-line bg-elevated overflow-hidden">
          <div className="p-6 border-b border-line bg-surface/50">
            <h2 className="text-lg font-semibold tracking-tight text-fg flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold">3</span>
              Risk & Logic Parameters
            </h2>
          </div>
          <div className="p-6 space-y-8">
            
            {/* Logic Group */}
            <div>
              <h3 className="text-sm font-medium text-fg flex items-center gap-2 mb-4">
                <Heartbeat size={16} className="text-accent" /> Execution Logic
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(["rangeMinutes", "minRange", "maxRange", "minVolume"] as NumericParam[]).map(key => {
                  const b = PARAM_BOUNDS[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-xs font-medium text-fg">{b.label}</label>
                        <span className="text-xs text-fg-subtle font-mono">{params[key]}{b.suffix}</span>
                      </div>
                      <input
                        type="range"
                        min={b.min}
                        max={b.max}
                        step={b.step}
                        value={params[key]}
                        onChange={(e) => handleNumParam(key, e.target.value)}
                        className="w-full accent-accent"
                      />
                      <p className="text-[11px] text-fg-muted mt-1">{b.help}</p>
                    </div>
                  );
                })}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-line">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={params.trendFilter} onChange={e => handleBoolParam("trendFilter", e.target.checked)} className="accent-accent w-4 h-4 rounded" />
                  <span className="text-xs font-medium text-fg">Moving Average Trend Filter</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={params.reEntry} onChange={e => handleBoolParam("reEntry", e.target.checked)} className="accent-accent w-4 h-4 rounded" />
                  <span className="text-xs font-medium text-fg">Allow Re-entries</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={params.newsPause} onChange={e => handleBoolParam("newsPause", e.target.checked)} className="accent-accent w-4 h-4 rounded" />
                  <span className="text-xs font-medium text-fg">Pause on High-Impact News</span>
                </label>
              </div>
            </div>

            {/* Risk Group */}
            <div className="pt-8 border-t border-line">
              <h3 className="text-sm font-medium text-fg flex items-center gap-2 mb-4">
                <ShieldCheck size={16} className="text-warning" /> Risk Management
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(["riskPct", "rrTarget", "trailingStopPct", "dailyLoss", "maxTrades"] as NumericParam[]).map(key => {
                  const b = PARAM_BOUNDS[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-xs font-medium text-fg">{b.label}</label>
                        <span className="text-xs text-fg-subtle font-mono">{params[key]}{b.suffix}</span>
                      </div>
                      <input
                        type="range"
                        min={b.min}
                        max={b.max}
                        step={b.step}
                        value={params[key]}
                        onChange={(e) => handleNumParam(key, e.target.value)}
                        className="w-full accent-accent"
                      />
                      <p className="text-[11px] text-fg-muted mt-1 leading-relaxed">{b.help}</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <Button type="button" variant="secondary" onClick={() => router.push("/dashboard")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !selectedAccountId} className="px-8 shadow-lg shadow-accent/20">
            {loading ? "Deploying Bot..." : "Deploy Bot"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
