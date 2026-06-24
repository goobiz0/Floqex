
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { authUrl } from "@/lib/urls";

const plans = [
  {
    name: "Trader",
    price: "$19",
    period: "/mo",
    description: "For active traders looking to automate their manual strategies.",
    features: [
      "1 Active Bot",
      "Standard execution speed",
      "1,000 backtests per month",
      "Email support",
      "Daily drawdown limits",
    ],
    buttonText: "Start Trader",
    variant: "secondary" as const,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "Advanced automation and faster execution for serious traders.",
    features: [
      "5 Active Bots",
      "Priority execution speed",
      "Unlimited backtests",
      "Priority email support",
      "Custom Webhook alerts",
      "Advanced Risk Control",
    ],
    buttonText: "Start Pro",
    variant: "primary" as const,
    highlight: true,
  },
  {
    name: "Elite",
    price: "$99",
    period: "/mo",
    description: "Institutional-grade infrastructure for quantitative traders.",
    features: [
      "25 Active Bots",
      "Ultra-low latency execution",
      "Unlimited backtests",
      "24/7 dedicated support",
      "Full API access",
      "Sub-account management",
      "Custom indicator scripting",
    ],
    buttonText: "Start Elite",
    variant: "secondary" as const,
  },
];

export function PricingTable() {
  return (
    <section className="py-32 bg-base relative overflow-hidden" id="pricing">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-line to-transparent" />
      
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl font-medium tracking-tight text-fg md:text-5xl mb-6">
            Transparent pricing. <br className="md:hidden" /> No surprises.
          </h2>
          <p className="text-lg text-fg-muted max-w-xl mx-auto">
            Choose the plan that fits your trading volume. All plans include our core risk management engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-[32px] border ${
                plan.highlight 
                  ? "bg-surface border-line-strong shadow-sm" 
                  : "bg-base border-line"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-fg text-base px-3 py-1 rounded-full text-xs font-medium tracking-wide">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-medium text-fg mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-semibold tracking-tight text-fg">{plan.price}</span>
                  <span className="text-fg-subtle">{plan.period}</span>
                </div>
                <p className="text-sm text-fg-muted h-10">
                  {plan.description}
                </p>
              </div>

              <div className="mb-10 flex-1">
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check size={18} className="text-accent shrink-0 mt-0.5" weight="bold" />
                      <span className="text-sm text-fg-subtle">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                href={authUrl("/sign-up")} 
                variant={plan.variant} 
                className={`w-full h-12 rounded-full ${plan.highlight ? "" : "bg-surface hover:bg-overlay"}`}
              >
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
