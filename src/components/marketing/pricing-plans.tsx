import { Check } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { authUrl } from "@/lib/urls";
import { cn } from "@/lib/utils";

/**
 * Canonical pricing grid. Single source of truth for both the marketing home
 * page and the dedicated /pricing route, driven off the real plan catalogue in
 * src/lib/plans.ts so the two surfaces can never drift apart.
 */
export function PricingPlans({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        return (
          <div
            key={id}
            className={cn(
              "relative flex flex-col rounded-[var(--radius-card)] border bg-elevated p-7 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]",
              plan.popular
                ? "border-accent/40 shadow-[var(--shadow-sm)]"
                : "border-line hover:border-line-strong",
            )}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-7 rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-on-accent)]">
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
              className="mt-7 h-12 w-full font-semibold active:scale-[0.98]"
            >
              {plan.price === 0 ? "Get started" : `Choose ${plan.name}`}
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
  );
}
