import { ArrowRight, ChartLineUp, Flask, Notebook, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoWall } from "@/components/marketing/logo-wall";
import { authUrl } from "@/lib/urls";
import { getDemoPreview } from "@/lib/queries";
import { LandingClientVisuals } from "./landing-client-visuals";

export const revalidate = 300;

export default async function LandingPage() {
  const demo = await getDemoPreview();

  return (
    <div className="bg-base overflow-hidden selection:bg-accent/20">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32">
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle animated background grid / glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/20 blur-[100px] rounded-full opacity-50 mix-blend-screen" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full mix-blend-screen" />
        </div>

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
            A beautiful, intelligent trading platform that automates your strategies while keeping you completely in control.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button href={authUrl("/sign-up")} size="lg" className="rounded-full w-full sm:w-auto h-12 px-8 text-[15px]">
              Start building for free
            </Button>
            <Button href="#visuals" variant="secondary" size="lg" className="rounded-full w-full sm:w-auto h-12 px-8 text-[15px] bg-surface/80 backdrop-blur-sm border border-line">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 relative overflow-hidden bg-base border-line p-8 rounded-[32px] min-h-[360px] flex flex-col">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 blur-[50px] rounded-full" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-line">
                  <ChartLineUp size={20} className="text-accent" />
                </div>
                <span className="font-medium">Live Dashboard</span>
              </div>
              <h3 className="text-2xl font-medium tracking-tight mt-auto max-w-sm relative z-10">
                Monitor all your active bots and equity in real-time.
              </h3>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[32px] text-white flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Flask size={20} />
                </div>
                <span className="font-medium text-white/90">Strategy Lab</span>
              </div>
              <h3 className="text-xl font-medium tracking-tight mt-auto">
                Tune parameters instantly.
              </h3>
            </Card>

            <Card className="relative overflow-hidden bg-base border-line p-8 rounded-[32px] min-h-[300px] flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-line">
                  <Notebook size={20} className="text-accent" />
                </div>
                <span className="font-medium">Journal</span>
              </div>
              <h3 className="text-xl font-medium tracking-tight mt-auto">
                Automated trade journaling.
              </h3>
            </Card>

            <Card className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-rose-400 to-orange-400 p-8 rounded-[32px] text-white flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <ShieldCheck size={20} />
                </div>
                <span className="font-medium text-white/90">Risk Control</span>
              </div>
              <h3 className="text-2xl font-medium tracking-tight mt-auto max-w-sm">
                Strict limits keep your capital completely safe.
              </h3>
            </Card>
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
