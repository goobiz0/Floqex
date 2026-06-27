import { Check, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { authUrl } from "@/lib/urls";
import { cn } from "@/lib/utils";

/**
 * Home pricing. Leads with the genuinely-free tier (paper trading, no card),
 * then the three paid tiers. All figures and features come from the real plan
 * catalogue in lib/plans.ts so this can never drift from billing.
 */

const free = PLANS.FREE;
const paid = [PLANS.TRADER, PLANS.PRO, PLANS.ELITE];

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 md:py-28">
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

        {/* Free lead panel */}
        <div className="mt-12 overflow-hidden rounded-[var(--radius-lg)] border border-accent/30 bg-elevated">
          <div className="relative flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_120%_at_0%_50%,var(--color-accent-soft),transparent_60%)]"
            />
            <div className="relative max-w-md">
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-accent-soft px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent">
                <Sparkle size={13} weight="fill" />
                Free forever
              </span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="tnum text-4xl font-semibold tracking-tight text-fg">
                  $0
                </span>
                <span className="text-sm font-medium text-fg-subtle">
                  to paper trade
                </span>
              </div>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-fg-muted">
                {free.tagline} Get the full dashboard, journal and agent feed on
                a simulated account, with no time limit and no payment details.
              </p>
            </div>

            <div className="relative flex flex-col gap-5">
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {free.features.map((f) => (
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
              <Button
                href={authUrl("/sign-up")}
                size="lg"
                className="h-12 px-7 font-semibold"
              >
                Start free
              </Button>
            </div>
          </div>
        </div>

        {/* Paid tiers */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {paid.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-card)] border bg-elevated p-7 transition-[transform,border-color] duration-300 hover:-translate-y-1",
                plan.popular
                  ? "border-accent/40"
                  : "border-line hover:border-line-strong",
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-7 rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--color-on-accent)]">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-fg">{plan.name}</h3>
              <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-fg-subtle">
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
                size="lg"
                className="mt-7 h-12 w-full font-semibold"
              >
                Choose {plan.name}
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
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-fg-subtle">
          Every plan includes the core risk engine. Cancel or downgrade any
          time.
        </p>
      </div>
    </section>
  );
}
