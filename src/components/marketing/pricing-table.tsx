import { PricingPlans } from "./pricing-plans";

export function PricingTable() {
  return (
    <section className="relative overflow-hidden bg-base py-32" id="pricing">
      <div className="absolute left-1/2 top-0 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-line to-transparent" />

      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-5 text-3xl font-semibold tracking-tight text-fg md:text-5xl">
            Transparent pricing. <br className="md:hidden" /> No surprises.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-fg-muted">
            Start free on paper. Upgrade for live trading, more bots, and pro
            tooling. Every plan includes the core risk engine.
          </p>
        </div>

        <PricingPlans className="mx-auto max-w-6xl" />
      </div>
    </section>
  );
}
