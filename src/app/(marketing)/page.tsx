import { ArrowRight, ChartLineUp, Flask, Notebook, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { LogoWall } from "@/components/marketing/logo-wall";
import { authUrl } from "@/lib/urls";
import { BentoCard } from "@/components/marketing/bento-card";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingTable } from "@/components/marketing/pricing-table";
import { HeroClient } from "@/components/marketing/hero-client";
import { InfrastructureVisual } from "@/components/marketing/bento-visuals/infrastructure-visual";
import { StrategyLabVisual } from "@/components/marketing/bento-visuals/strategy-lab-visual";
import { RiskControlVisual } from "@/components/marketing/bento-visuals/risk-control-visual";

export const revalidate = 300;

export default function LandingPage() {
  return (
    <div className="bg-base overflow-hidden selection:bg-accent/20 relative">
      <div className="absolute inset-0 grid-faint pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[800px] bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none" />

      <HeroClient />

      <LogoWall />

      <HowItWorks />

      {/* Bento Grid Features */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-surface/50 border-y border-line" />
        <div className="mx-auto max-w-[1200px] px-6 relative z-10">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl font-semibold tracking-tight text-fg md:text-5xl mb-4">
              Everything you need to scale.
            </h2>
            <p className="text-lg text-fg-muted">
              We abstracted away the complex engineering so you can focus entirely on your trading edge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BentoCard className="md:col-span-2 min-h-[320px] group" innerClassName="bg-white border border-line/80 shadow-sm p-10 flex flex-col justify-between">
              <InfrastructureVisual />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-full bg-surface shadow-sm flex items-center justify-center border border-line">
                  <ChartLineUp size={24} className="text-fg" weight="duotone" />
                </div>
                <span className="font-bold text-xs uppercase tracking-[0.15em] text-fg-subtle">Infrastructure</span>
              </div>
              <div className="mt-auto max-w-sm relative z-10">
                <h3 className="text-2xl font-semibold tracking-tight mb-3 text-fg">
                  Low-latency execution.
                </h3>
                <p className="text-fg-subtle text-[15px] leading-relaxed">
                  Our engine processes market data and executes orders in milliseconds, directly at the broker level for zero slippage.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[320px] group" innerClassName="bg-white border border-line/80 shadow-sm p-10 flex flex-col justify-between">
              <StrategyLabVisual />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-full bg-surface shadow-sm flex items-center justify-center border border-line">
                  <Flask size={24} className="text-fg" weight="duotone" />
                </div>
                <span className="font-bold text-xs uppercase tracking-[0.15em] text-fg-subtle">Strategy Lab</span>
              </div>
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-semibold tracking-tight mb-3 text-fg">
                  Tune instantly.
                </h3>
                <p className="text-fg-subtle text-[15px] leading-relaxed">
                  Visual node-based backtesting without a single line of code.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[320px] group" innerClassName="bg-white border border-line/80 shadow-sm p-10 flex flex-col justify-between">
              <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-full bg-surface shadow-sm flex items-center justify-center border border-line">
                  <Notebook size={24} className="text-fg" weight="duotone" />
                </div>
                <span className="font-bold text-xs uppercase tracking-[0.15em] text-fg-subtle">Journal</span>
              </div>
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-semibold tracking-tight mb-3 text-fg">
                  Automated records.
                </h3>
                <p className="text-fg-subtle text-[15px] leading-relaxed">
                  Every execution is logged and analyzed automatically.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="md:col-span-2 min-h-[320px] group" innerClassName="bg-white border border-line/80 shadow-sm p-10 flex flex-col justify-between">
              <RiskControlVisual />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-full bg-surface shadow-sm flex items-center justify-center border border-line">
                  <ShieldCheck size={24} className="text-fg" weight="duotone" />
                </div>
                <span className="font-bold text-xs uppercase tracking-[0.15em] text-fg-subtle">Risk Control</span>
              </div>
              <div className="mt-auto max-w-sm relative z-10">
                <h3 className="text-2xl font-semibold tracking-tight mb-3 text-fg">
                  Hard limits that actually work.
                </h3>
                <p className="text-fg-subtle text-[15px] leading-relaxed">
                  Set daily drawdown limits and max position sizing. Our engine enforces them at the broker level, keeping your capital safe.
                </p>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      <PricingTable />

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-surface/80 border-t border-line" />
        <div className="absolute inset-0 grid-faint pointer-events-none opacity-50" />
        
        <div className="relative z-10 mx-auto max-w-3xl text-center px-6">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-fg mb-8">
            Ready to trade?
          </h2>
          <Button href={authUrl("/sign-up")} size="lg" className="rounded-full h-14 px-10 text-[16px] shadow-lg shadow-accent/20 font-semibold tracking-wide">
            Open your account
            <ArrowRight size={20} weight="bold" className="ml-2" />
          </Button>
        </div>
      </section>

      {/* Regulatory Disclaimer */}
      <section className="bg-base border-t border-line py-12 relative z-10">
        <div className="mx-auto max-w-[1200px] px-6 text-center">
          <p className="max-w-4xl mx-auto text-xs leading-relaxed text-fg-muted/80">
            <strong className="font-semibold text-fg-subtle">Risk Warning:</strong> Trading involves a high level of risk and may not be suitable for all investors. 
            The high degree of leverage can work against you as well as for you. Before deciding to trade, you should carefully consider your investment objectives, 
            level of experience, and risk appetite. Past performance is not indicative of future results. Any simulated or hypothetical performance results shown 
            on this website are for illustrative purposes only and do not represent actual live trading. The results do not promise or guarantee any specific outcome 
            or profit. You should be aware of all the risks associated with trading and seek advice from an independent financial advisor if you have any doubts.
          </p>
        </div>
      </section>
    </div>
  );
}
