import { ArcRevealHero } from "@/components/ui/arc-preloader-hero";
import { HomeHero } from "@/components/marketing/home/home-hero";
import { BrokerStrip } from "@/components/marketing/home/broker-strip";
import { Workflow } from "@/components/marketing/home/workflow";
import { FeatureBento } from "@/components/marketing/home/feature-bento";
import { PricingSection } from "@/components/marketing/home/pricing-section";
import { ClosingCta } from "@/components/marketing/home/closing-cta";

export const revalidate = 300;

/**
 * Greeting words cycled by the arc-reveal curtain before the landing surface
 * appears. Same intro motion as before, new copy: a short build of the Floqex
 * workflow ending on the brand.
 */
const introGreetings = [
  { text: "Define." },
  { text: "Backtest." },
  { text: "Deploy." },
  { text: "Automate." },
  { text: "Disciplined." },
  { text: "Relentless." },
  { text: "In control." },
  { text: "Floqex." },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-base selection:bg-accent/20">
      <ArcRevealHero storageKey="floqex-intro" greetings={introGreetings}>
        <HomeHero />
      </ArcRevealHero>

      <BrokerStrip />
      <Workflow />
      <FeatureBento />
      <PricingSection />
      <ClosingCta />

      {/* Regulatory disclaimer */}
      <section className="border-t border-line bg-base py-12">
        <div className="mx-auto max-w-[1200px] px-6 text-center">
          <p className="mx-auto max-w-4xl text-xs leading-relaxed text-fg-muted/80">
            <strong className="font-semibold text-fg-subtle">
              Risk warning:
            </strong>{" "}
            Trading involves a high level of risk and may not be suitable for all
            investors. The high degree of leverage can work against you as well
            as for you. Before deciding to trade, you should carefully consider
            your investment objectives, level of experience, and risk appetite.
            Past performance is not indicative of future results. Any simulated
            or hypothetical performance results shown on this website are for
            illustrative purposes only and do not represent actual live trading.
            The results do not promise or guarantee any specific outcome or
            profit. You should be aware of all the risks associated with trading
            and seek advice from an independent financial advisor if you have any
            doubts.
          </p>
        </div>
      </section>
    </div>
  );
}
