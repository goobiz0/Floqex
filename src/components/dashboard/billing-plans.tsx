"use client";

import { useState, useTransition } from "react";
import { Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, PLAN_ORDER, type Plan } from "@/lib/plans";
import { startCheckout, openBillingPortal } from "@/app/dashboard/billing/actions";

export function BillingPlans({
  currentPlan,
  hasCustomer,
}: {
  currentPlan: Plan;
  hasCustomer: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);

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

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id, i) => {
          const plan = PLANS[id];
          const isCurrent = id === currentPlan;
          const isUpgrade = i > currentIndex;
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
                  <div className="space-y-4">
                    {hasCustomer && plan.price > 0 ? (
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
                    )}
                    
                    <div className="relative z-10 rounded-[var(--radius-control)] border border-line bg-base/40 p-3">
                      <p className="mb-2 flex items-center justify-between text-xs font-medium text-fg">
                        <span>API Usage</span>
                        <span className="tnum">14,230 / {plan.name === 'Free' ? '50,000' : plan.name === 'Pro' ? '250,000' : 'Unlimited'}</span>
                      </p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                        <div 
                          className="h-full rounded-full bg-accent" 
                          style={{ width: plan.name === 'Unlimited' ? '5%' : plan.name === 'Pro' ? '5.6%' : '28.4%' }}
                        />
                      </div>
                    </div>
                  </div>
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
        <h3 className="mb-6 text-lg font-semibold text-fg">Compare Plans</h3>
        <table className="w-full text-left text-sm text-fg-subtle">
          <thead>
            <tr className="border-b border-line">
              <th className="py-4 font-medium text-fg w-1/4">Features</th>
              {PLAN_ORDER.map(id => (
                <th key={id} className="px-4 py-4 font-medium text-fg w-1/4">{PLANS[id].name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className="py-4 text-fg">Max Trading Accounts</td>
              <td className="px-4 py-4">{PLANS.FREE.accountLimit}</td>
              <td className="px-4 py-4">{PLANS.PRO.accountLimit}</td>
              <td className="px-4 py-4">Unlimited</td>
            </tr>
            <tr>
              <td className="py-4 text-fg">Live Market Trading</td>
              <td className="px-4 py-4"><span className="text-negative font-medium">No</span></td>
              <td className="px-4 py-4"><span className="text-profit font-medium">Yes</span></td>
              <td className="px-4 py-4"><span className="text-profit font-medium">Yes</span></td>
            </tr>
            <tr>
              <td className="py-4 text-fg">Mochi AI Access</td>
              <td className="px-4 py-4">Basic</td>
              <td className="px-4 py-4">Advanced</td>
              <td className="px-4 py-4">Priority</td>
            </tr>
            <tr>
              <td className="py-4 text-fg">Market Data Ingestion</td>
              <td className="px-4 py-4">1-minute polling</td>
              <td className="px-4 py-4 text-fg font-medium">Real-time WebSockets</td>
              <td className="px-4 py-4 text-fg font-medium">Real-time WebSockets</td>
            </tr>
            <tr>
              <td className="py-4 text-fg">Max Daily Drawdown</td>
              <td className="px-4 py-4">Fixed (1%)</td>
              <td className="px-4 py-4">Customizable</td>
              <td className="px-4 py-4">Uncapped</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
