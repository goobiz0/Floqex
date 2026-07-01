import type { Metadata } from "next";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { PricingPageTracker } from "@/components/marketing/pricing-page-tracker";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Paper trade free. Upgrade for live trading, more bots, and pro tooling.",
};

export default function PricingPage() {
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
      <PricingPageTracker />
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-fg sm:text-5xl lg:text-6xl">
          Start free. Go live when you are ready.
        </h1>
        <p className="mt-6 text-pretty text-lg text-fg-muted">
          Paper trade on the free plan for as long as you like. Upgrade for live trading, more
          bots, and pro tooling. Cancel anytime.
        </p>
      </div>

      <PricingPlans className="mt-14" />

      <p className="mt-10 text-center text-xs text-fg-subtle">
        Prices in USD. Paper trading is free forever. Trading involves risk of loss.
      </p>
    </div>
  );
}
