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
      const res = await action();
      if (res.ok && res.url) {
        window.location.assign(res.url);
      } else {
        setError(res.error ?? "Something went wrong. Please try again.");
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
                "relative flex flex-col rounded-[var(--radius-card)] border bg-elevated p-6",
                isCurrent ? "border-accent/60" : "border-line",
              )}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-6 rounded-[var(--radius-pill)] bg-accent px-2.5 py-0.5 text-xs font-medium text-base">
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
                  hasCustomer && plan.price > 0 ? (
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full"
                      disabled={pending}
                      onClick={() => go(openBillingPortal)}
                    >
                      Manage billing
                    </Button>
                  ) : (
                    <Button variant="secondary" size="md" className="w-full" disabled>
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

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
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
    </div>
  );
}
