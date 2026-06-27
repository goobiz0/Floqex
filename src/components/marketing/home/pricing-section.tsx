import { Check, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { authUrl } from "@/lib/urls";
import { cn } from "@/lib/utils";

export function PricingSection() {
  return (
    <section id="pricing" className="relative border-t border-line py-24 md:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg md:text-4xl">
            Free to start. Paid when you go live.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Paper trade for as long as you like on the free plan, no card
            required. Upgrade only when you want live execution, more bots and
            pro tooling.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-[var(--radius-card)] border bg-elevated p-7 transition-[transform,border-color] duration-300 hover:-translate-y-1",
                  plan.popular
                    ? "border-accent/40"
                    : "border-line hover:border-line-strong",
                )}
              >
                {plan.id === "FREE" && (
                  <span className="absolute -top-3 left-7 flex items-center gap-1 rounded-[var(--radius-pill)] bg-surface border border-line px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-fg-muted">
                    <Sparkle size={12} weight="fill" className="text-accent" />
                    Forever Free
                  </span>
                )}
                {plan.popular && (
                  <span className="absolute -top-3 left-7 rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--color-on-accent)]">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-fg">{plan.name}</h3>
                <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-fg-subtle">
                  {plan.tagline}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="tnum text-4xl font-semibold tracking-tight text-fg">
                    ${plan.price}
                  </span>
                  <span className="text-sm font-medium text-fg-subtle">/mo</span>
                </div>
                <Button
                  href={authUrl("/sign-up")}
                  variant={plan.popular ? "primary" : "secondary"}
                  size="md"
                  className="mt-7 w-full font-semibold"
                >
                  {plan.id === "FREE" ? "Start free" : `Choose ${plan.name}`}
                </Button>
                <ul className="mt-6 space-y-3 border-t border-line pt-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-fg-muted"
                    >
                      <Check
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-accent"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-fg-subtle">
          Every plan includes the core risk engine. Cancel or downgrade any
          time.
        </p>
      </div>
    </section>
  );
}
