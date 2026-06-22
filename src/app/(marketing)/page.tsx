import { ArrowRight, ChartLineUp, Flask, Notebook, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoWall } from "@/components/marketing/logo-wall";
import { authUrl } from "@/lib/urls";
import { getDemoPreview } from "@/lib/queries";
import { HeroInteractiveBackground } from "@/components/marketing/hero-interactive-background";
import { BentoCard } from "@/components/marketing/bento-card";

export const revalidate = 300;

export default async function LandingPage() {
  const demo = await getDemoPreview();

  return (
    <div className="bg-base overflow-hidden selection:bg-accent/20">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32">
        <HeroInteractiveBackground />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/50 px-3 py-1 text-xs font-medium text-fg-subtle backdrop-blur-md mb-8">
            <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
            Introducing Floqex Trading Automations
          </div>
          
          <h1 className="mx-auto max-w-4xl text-balance text-5xl font-medium tracking-tight text-fg md:text-7xl leading-[1.05]">
            Trade smarter. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500">
              Zero code required.
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-fg-muted md:text-xl">
            A beautiful, intelligent trading platform that automates your strategies while keeping you completely in control. Built for speed, safety, and clarity.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button href={authUrl("/sign-up")} size="lg" className="rounded-full w-full sm:w-auto h-12 px-8 text-[15px]">
              Start building for free
            </Button>
            <Button href="#visuals" variant="secondary" size="lg" className="rounded-full w-full sm:w-auto h-12 px-8 text-[15px] bg-surface/80 backdrop-blur-sm border border-line shadow-sm transition-all hover:bg-surface">
              Explore platform
            </Button>
          </div>
        </div>
      </section>

      {/* Floating Interactive Visual Showcase */}
      <section id="visuals" className="relative z-20 mx-auto max-w-[1200px] px-6 -mt-8 pb-20">
        <LandingClientVisuals />
      </section>

      <LogoWall />

      {/* Bento Grid Features */}
      <section className="py-24 bg-surface/30">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl font-medium tracking-tight text-fg md:text-4xl">
              Everything you need to scale.
            </h2>
            <p className="mt-4 text-lg text-fg-muted">
              We abstracted away the complex engineering so you can focus entirely on your trading edge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BentoCard className="md:col-span-2 min-h-[360px]" innerClassName="bg-base border-line p-8">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/5 blur-[50px] rounded-full" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-line">
                  <ChartLineUp size={20} className="text-accent" />
                </div>
                <span className="font-medium">Live Dashboard</span>
              </div>
              <div className="mt-auto max-w-sm relative z-10">
                <h3 className="text-2xl font-medium tracking-tight mb-2">
                  Total visibility, real-time control.
                </h3>
                <p className="text-fg-subtle text-sm">
                  Monitor all your active bots, open positions, and equity curves in a beautiful, unified command center. Pause or resume strategies instantly.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[360px]" innerClassName="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white border-none">
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Flask size={20} />
                </div>
                <span className="font-medium text-white/90">Strategy Lab</span>
              </div>
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-medium tracking-tight mb-2">
                  Tune instantly.
                </h3>
                <p className="text-white/70 text-sm">
                  Backtest and optimize your parameters without touching a single line of code.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[360px]" innerClassName="bg-base border-line p-8">
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-line">
                  <Notebook size={20} className="text-accent" />
                </div>
                <span className="font-medium">Journal</span>
              </div>
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-medium tracking-tight mb-2">
                  Automated records.
                </h3>
                <p className="text-fg-subtle text-sm">
                  Every execution is logged, tagged, and analyzed automatically to help you find your edge.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="md:col-span-2 min-h-[360px]" innerClassName="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white border-none">
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <ShieldCheck size={20} />
                </div>
                <span className="font-medium text-white/90">Risk Control</span>
              </div>
              <div className="mt-auto max-w-sm relative z-10">
                <h3 className="text-2xl font-medium tracking-tight mb-2">
                  Hard limits that actually work.
                </h3>
                <p className="text-white/70 text-sm">
                  Set daily drawdown limits and max position sizing. Our engine enforces them at the broker level, keeping your capital completely safe.
                </p>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-accent/5" />
        <div className="relative mx-auto max-w-3xl text-center px-6">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-fg mb-8">
            Ready to trade?
          </h2>
          <Button href={authUrl("/sign-up")} size="lg" className="rounded-full h-14 px-10 text-[16px]">
            Open your account
            <ArrowRight size={20} weight="bold" className="ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
