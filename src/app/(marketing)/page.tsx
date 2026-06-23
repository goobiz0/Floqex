import { ArrowRight, ChartLineUp, Flask, Notebook, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { LogoWall } from "@/components/marketing/logo-wall";
import { authUrl } from "@/lib/urls";
import { LandingClientVisuals } from "./landing-client-visuals";
import { VibrantMesh } from "@/components/marketing/vibrant-mesh";
import { BentoCard } from "@/components/marketing/bento-card";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingTable } from "@/components/marketing/pricing-table";

export const revalidate = 300;

export default function LandingPage() {
  return (
    <div className="bg-base overflow-hidden selection:bg-accent/20">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-32 md:pt-48 md:pb-40">
        <VibrantMesh />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle backdrop-blur-md mb-8 shadow-sm ring-1 ring-black/5">
            <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
            Live automated execution
          </div>
          
          <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-fg md:text-7xl leading-[1.05]">
            Trade smarter. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
              Zero code required.
            </span>
          </h1>
          
          <p className="mt-6 max-w-xl text-pretty text-lg text-fg-muted md:text-xl">
            A precise trading engine that automates your strategies while keeping you completely in control. Built for speed and absolute clarity.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Button href={authUrl("/sign-up")} size="lg" className="rounded-full w-full sm:w-auto h-14 px-8 text-[16px] shadow-lg shadow-accent/20">
              Start building for free
            </Button>
            <Button href="#visuals" variant="secondary" size="lg" className="rounded-full w-full sm:w-auto h-14 px-8 text-[16px] bg-white/60 backdrop-blur-md border border-white/50 shadow-sm transition-all hover:bg-white/80 text-fg">
              Explore platform
            </Button>
          </div>
        </div>
      </section>

      {/* Floating Interactive Visual Showcase (Overlapping Hero) */}
      <section id="visuals" className="relative z-20 mx-auto max-w-[1200px] px-6 -mt-24 md:-mt-32 pb-20">
        <LandingClientVisuals />
      </section>

      <LogoWall />

      <HowItWorks />

      {/* Bento Grid Features */}
      <section className="py-24 bg-surface/30 relative">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl font-medium tracking-tight text-fg md:text-5xl mb-4">
              Everything you need to scale.
            </h2>
            <p className="text-lg text-fg-muted">
              We abstracted away the complex engineering so you can focus entirely on your trading edge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BentoCard className="md:col-span-2 min-h-[360px] group" innerClassName="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-8">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/10 blur-[60px] rounded-full transition-opacity group-hover:opacity-100 opacity-50" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/80 shadow-sm flex items-center justify-center border border-white/50">
                  <ChartLineUp size={20} className="text-accent" />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wider text-fg-subtle">Live Dashboard</span>
              </div>
              <div className="mt-auto max-w-sm relative z-10">
                <h3 className="text-3xl font-medium tracking-tight mb-2 text-fg">
                  Total visibility, real-time control.
                </h3>
                <p className="text-fg-subtle text-[15px]">
                  Monitor all your active bots, open positions, and equity curves in a beautiful, unified command center.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[360px] group" innerClassName="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-8">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 blur-[50px] rounded-full transition-opacity group-hover:opacity-100 opacity-30" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/80 shadow-sm flex items-center justify-center border border-white/50">
                  <Flask size={20} className="text-blue-500" />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wider text-fg-subtle">Strategy Lab</span>
              </div>
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-medium tracking-tight mb-2 text-fg">
                  Tune instantly.
                </h3>
                <p className="text-fg-subtle text-[15px]">
                  Backtest and optimize your parameters without touching a single line of code.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[360px] group" innerClassName="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-8">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 blur-[50px] rounded-full transition-opacity group-hover:opacity-100 opacity-30" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/80 shadow-sm flex items-center justify-center border border-white/50">
                  <Notebook size={20} className="text-purple-500" />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wider text-fg-subtle">Journal</span>
              </div>
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-medium tracking-tight mb-2 text-fg">
                  Automated records.
                </h3>
                <p className="text-fg-subtle text-[15px]">
                  Every execution is logged, tagged, and analyzed automatically to help you find your edge.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="md:col-span-2 min-h-[360px] group" innerClassName="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-8">
              <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 blur-[60px] rounded-full transition-opacity group-hover:opacity-100 opacity-50" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/80 shadow-sm flex items-center justify-center border border-white/50">
                  <ShieldCheck size={20} className="text-emerald-500" />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wider text-fg-subtle">Risk Control</span>
              </div>
              <div className="mt-auto max-w-md relative z-10">
                <h3 className="text-3xl font-medium tracking-tight mb-2 text-fg">
                  Hard limits that actually work.
                </h3>
                <p className="text-fg-subtle text-[15px]">
                  Set daily drawdown limits and max position sizing. Our engine enforces them at the broker level, keeping your capital completely safe.
                </p>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      <PricingTable />

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-accent/5" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative mx-auto max-w-3xl text-center px-6">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-fg mb-8">
            Ready to trade?
          </h2>
          <Button href={authUrl("/sign-up")} size="lg" className="rounded-full h-14 px-10 text-[16px] shadow-lg shadow-accent/20">
            Open your account
            <ArrowRight size={20} weight="bold" className="ml-2" />
          </Button>
        </div>
      </section>

      {/* Regulatory Disclaimer */}
      <section className="bg-base border-t border-line py-12">
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
