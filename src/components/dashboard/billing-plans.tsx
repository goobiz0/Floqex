"use client";

import { useState, useTransition } from "react";
import { Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, PLAN_ORDER, formatAccountLimit, type Plan } from "@/lib/plans";
import { startCheckout, openBillingPortal, toggleUseExtraBalance } from "@/app/dashboard/billing/actions";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { CurrencyDollar } from "@phosphor-icons/react";
import { toast } from "sonner";

// Monthly engine-action allowance per plan (real usage is metered against this).
const ACTION_LIMIT: Record<Plan, number> = {
  FREE: 50_000,
  TRADER: 250_000,
  PRO: 1_000_000,
  ELITE: Infinity,
};

// Driven off the real plan catalogue so the table can never drift out of sync
// with the cards above (a boolean renders as Yes/No, a string renders as-is).
const COMPARISON_ROWS: { label: string; get: (p: Plan) => string | boolean }[] = [
  { label: "Max accounts / bots", get: (p) => formatAccountLimit(PLANS[p].accountLimit) },
  { label: "Live market trading", get: (p) => PLANS[p].liveTrading },
  { label: "AI strategy analysis", get: (p) => PLANS[p].aiAnalysis },
  { label: "Copy trading", get: (p) => PLANS[p].copyTrading },
  { label: "Engine actions / month", get: (p) => (Number.isFinite(ACTION_LIMIT[p]) ? ACTION_LIMIT[p].toLocaleString() : "Unlimited") },
  { label: "Strategy sandbox & backtest", get: () => true },
  { label: "Priority support", get: (p) => p !== "FREE" },
];

// Only paid tiers get a pricing card. Showing Free too made four cards spill
// out of the three-column row; Free still lives in the comparison table below
// and in the "Current plan" summary at the top of the page.
const PAID_PLAN_ORDER = PLAN_ORDER.filter((id) => PLANS[id].price > 0);

export function BillingPlans({
  currentPlan,
  hasCustomer,
  monthlyUsage = 0,
}: {
  currentPlan: Plan;
  hasCustomer: boolean;
  monthlyUsage?: number;
  extraBalanceUsd?: number;
  useExtraBalance?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [toppingUp, setToppingUp] = useState(false);
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);

  async function handleToggleUseExtraBalance(checked: boolean) {
    startTransition(async () => {
      const res = await toggleUseExtraBalance(checked);
      if (!res.ok) {
        toast.error(res.error || "Failed to update preference.");
      } else {
        toast.success(`Extra balance ${checked ? "enabled" : "disabled"}.`);
      }
    });
  }

  async function handleTopup() {
    const amount = Number(topupAmount);
    if (!amount || amount < 5 || amount > 1000) {
      toast.error("Please enter an amount between $5 and $1000.");
      return;
    }
    
    setToppingUp(true);
    try {
      const res = await fetch("/api/checkout/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.assign(data.url);
      } else {
        toast.error(data.error || "Could not start checkout.");
      }
    } catch (e) {
      toast.error("Could not start checkout.");
    } finally {
      setToppingUp(false);
    }
  }

  function go(action: () => Promise<{ ok: boolean; url?: string; error?: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (res.ok && res.url) {
          window.location.assign(res.url);
        } else {
          setError(res.error ?? "Something went wrong. Please try again.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  // Engine-action usage for the active plan, shown for everyone (including Free)
  // so it no longer depends on the current plan having a card in the grid.
  const usageLimit = ACTION_LIMIT[currentPlan];
  const usagePct = Number.isFinite(usageLimit)
    ? Math.min(100, (monthlyUsage / usageLimit) * 100)
    : Math.min(100, monthlyUsage / 50_000);

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      )}

      <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-5">
        <p className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-fg">
          <span>Engine actions this month</span>
          <span className="tnum text-fg-subtle">
            {monthlyUsage.toLocaleString()} / {Number.isFinite(usageLimit) ? usageLimit.toLocaleString() : "Unlimited"}
          </span>
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${usagePct}%` }} />
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-semibold text-fg">Extra Credits Balance</h3>
          <p className="text-sm text-fg-subtle max-w-md mt-1">
            When you run out of plan limits, use your extra balance to keep trading and running AI models without interruption.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-3xl font-black text-fg tracking-tight tnum">
              ${(extraBalanceUsd || 0).toFixed(2)}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-fg">Auto-use extra balance</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Switch 
                  checked={useExtraBalance || false} 
                  onChange={handleToggleUseExtraBalance} 
                  label="Use Extra Balance" 
                />
                <span className="text-xs text-fg-subtle">
                  {useExtraBalance ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface/50 border border-line rounded-[var(--radius-control)] p-4 flex flex-col gap-3 min-w-[240px]">
          <p className="text-sm font-medium text-fg">Buy Extra Credits</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Amount ($5-$1000)"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              icon={<CurrencyDollar />}
              min={5}
              max={1000}
              className="bg-base"
            />
          </div>
          <Button 
            onClick={handleTopup} 
            disabled={toppingUp || !topupAmount || Number(topupAmount) < 5 || Number(topupAmount) > 1000}
            className="w-full"
          >
            {toppingUp ? "Loading..." : "Add to Balance"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PAID_PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === currentPlan;
          const isUpgrade = PLAN_ORDER.indexOf(id) > currentIndex;
          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-card)] border p-6 overflow-visible mt-3 lg:mt-0",
                isCurrent ? "border-accent/60 bg-base" : "border-line bg-elevated",
              )}
            >
              {isCurrent && plan.name !== 'Free' && (
                <div className="absolute inset-0 z-0 bg-gradient-to-l from-profit/10 via-transparent to-transparent pointer-events-none rounded-[var(--radius-card)]" />
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-6 rounded-[var(--radius-pill)] bg-accent px-2.5 py-0.5 text-xs font-medium text-[var(--color-on-accent)] z-10">
                  Current plan
                </span>
              )}
              <h3 className="text-lg font-semibold text-fg">{plan.name}</h3>
              <p className="mt-1 text-sm text-fg-subtle">{plan.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="tnum text-3xl font-semibold text-fg">${plan.price}</span>
                <span className="text-sm text-fg-subtle">/mo</span>
              </div>

              <div className="mt-5">
                {isCurrent ? (
                  hasCustomer ? (
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full relative z-10"
                      disabled={pending}
                      onClick={() => go(openBillingPortal)}
                    >
                      Manage billing
                    </Button>
                  ) : (
                    <Button variant="secondary" size="md" className="w-full relative z-10" disabled>
                      Current plan
                    </Button>
                  )
                ) : isUpgrade ? (
                  <Button
                    size="md"
                    className="w-full"
                    disabled={pending}
                    onClick={() => go(() => startCheckout(id))}
                  >
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    disabled={pending || !hasCustomer}
                    onClick={() => go(openBillingPortal)}
                  >
                    Switch plan
                  </Button>
                )}
              </div>

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5 relative z-10">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-fg-muted">
                    <Check size={15} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Detailed Feature Comparison Table */}
      <div className="mt-16 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-elevated p-6">
        <h3 className="mb-6 text-lg font-semibold text-fg">Compare plans</h3>
        <table className="w-full min-w-[640px] text-left text-sm text-fg-subtle">
          <thead>
            <tr className="border-b border-line">
              <th className="py-4 font-medium text-fg">Features</th>
              {PLAN_ORDER.map((id) => (
                <th key={id} className={cn("px-4 py-4 font-medium", id === currentPlan ? "text-accent" : "text-fg")}>
                  {PLANS[id].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.label}>
                <td className="py-4 text-fg">{row.label}</td>
                {PLAN_ORDER.map((id) => {
                  const v = row.get(id);
                  return (
                    <td key={id} className="px-4 py-4">
                      {v === true ? (
                        <span className="font-medium text-profit">Yes</span>
                      ) : v === false ? (
                        <span className="font-medium text-fg-faint">No</span>
                      ) : (
                        <span className={cn(id === currentPlan && "font-medium text-fg")}>{v}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
