import type { Metadata } from "next";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { authUrl } from "@/lib/urls";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Paper trade free. Upgrade for live trading, more bots, and pro tooling.",
};

export default function PricingPage() {
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div aria-hidden className="aurora pointer-events-none absolute inset-0 -z-10 opacity-70" />

      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Start free. Go live when you are ready.
        </h1>
        <p className="mt-4 text-pretty text-fg-muted">
          Paper trade on the free plan for as long as you like. Upgrade for live trading, more
          bots, and pro tooling. Cancel anytime.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-card)] border bg-elevated p-6",
                plan.popular ? "border-accent/60" : "border-line",
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-6 rounded-[var(--radius-pill)] bg-accent px-2.5 py-0.5 text-xs font-medium text-[var(--color-on-accent)]">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-fg">{plan.name}</h2>
              <p className="mt-1 text-sm text-fg-subtle">{plan.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="tnum text-4xl font-semibold tracking-tight text-fg">
                  ${plan.price}
                </span>
                <span className="text-sm text-fg-subtle">/mo</span>
              </div>
              <Button
                href={authUrl("/sign-up")}
                variant={plan.popular ? "primary" : "secondary"}
                size="lg"
                className="mt-6"
              >
                {plan.price === 0 ? "Get started" : `Choose ${plan.name}`}
              </Button>
              <ul className="mt-6 space-y-3 border-t border-line pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-fg-muted">
                    <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-fg-subtle">
        Prices in USD. Paper trading is free forever. Trading involves risk of loss.
      </p>
    </div>
  );
}
