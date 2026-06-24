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
    <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-fg sm:text-5xl lg:text-6xl">
          Start free. Go live when you are ready.
        </h1>
        <p className="mt-6 text-pretty text-lg text-fg-muted">
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
                "relative flex flex-col rounded-[var(--radius-card)] border bg-elevated p-8 transition-all duration-300 hover:shadow-[var(--shadow-md)] hover:-translate-y-1",
                plan.popular ? "border-accent/40 shadow-sm" : "border-line",
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-8 rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--color-on-accent)]">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-semibold text-fg">{plan.name}</h2>
              <p className="mt-2 text-sm text-fg-subtle leading-relaxed">{plan.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="tnum text-5xl font-semibold tracking-tight text-fg">
                  ${plan.price}
                </span>
                <span className="text-sm font-medium text-fg-subtle">/mo</span>
              </div>
              <Button
                href={authUrl("/sign-up")}
                variant={plan.popular ? "primary" : "secondary"}
                size="lg"
                className="mt-8 rounded-[var(--radius-control)] h-12 font-semibold active:scale-[0.98]"
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
