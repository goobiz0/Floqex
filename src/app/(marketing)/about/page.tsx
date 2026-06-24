import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Info, ShieldCheck, Lightning, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { AboutClientMotion } from "./about-client-motion";

export const metadata: Metadata = { title: "About | Floqex" };

export default function AboutPage() {
  return (
    <div className="bg-base overflow-hidden selection:bg-accent/20 min-h-screen relative pb-32">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 px-6">
        <div className="mx-auto max-w-[1200px] flex flex-col md:flex-row items-start justify-between gap-16 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle backdrop-blur-md mb-8 shadow-sm ring-1 ring-black/5">
              About Floqex
            </div>
            <h1 className="text-balance text-5xl font-semibold tracking-tight text-fg md:text-7xl leading-[1.05]">
              Systematic trading, <br />
              <span className="text-accent">
                democratized.
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-pretty text-lg text-fg-muted md:text-xl leading-relaxed">
              We built Floqex because the gap between institutional algorithms and retail traders was too wide. No emotions, strict risk management, and mathematically proven edges.
            </p>
          </div>

          {/* High Fidelity Static UI Component */}
          <div className="w-full max-w-md aspect-square relative flex items-center justify-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-accent/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10 w-full max-w-[320px] rounded-[var(--radius-card)] border border-line bg-base shadow-[var(--shadow-xl)] p-5 overflow-hidden flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-[8px] bg-accent-soft text-accent flex items-center justify-center font-bold font-mono text-xs">
                      ORB
                   </div>
                   <div>
                     <p className="text-sm font-semibold text-fg leading-none">Systematic Edge</p>
                     <p className="text-xs text-fg-subtle mt-1">Version 2.4.1</p>
                   </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center p-2 rounded-[var(--radius-control)] bg-surface border border-line">
                   <p className="text-xs font-medium text-fg-muted pl-1">Emotionless Execution</p>
                   <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center"><div className="h-1.5 w-1.5 bg-accent rounded-full" /></div>
                </div>
                <div className="flex justify-between items-center p-2 rounded-[var(--radius-control)] bg-surface border border-line">
                   <p className="text-xs font-medium text-fg-muted pl-1">Risk Management</p>
                   <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center"><div className="h-1.5 w-1.5 bg-accent rounded-full" /></div>
                </div>
                <div className="flex justify-between items-center p-2 rounded-[var(--radius-control)] bg-surface border border-line">
                   <p className="text-xs font-medium text-fg-muted pl-1">Data-Backed Logic</p>
                   <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center"><div className="h-1.5 w-1.5 bg-accent rounded-full" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Tenets - Staggered Reveal */}
      <section className="mx-auto max-w-[1200px] px-6 relative z-10">
        <AboutClientMotion className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4 rounded-[32px] bg-white/60 backdrop-blur-xl p-10 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)] hover:bg-white/80 transition-colors">
            <div className="h-14 w-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-6 shadow-sm">
              <TrendUp size={24} weight="regular" />
            </div>
            <h3 className="text-2xl font-medium tracking-tight text-fg">Opening Range Breakouts</h3>
            <p className="text-fg-subtle text-[15px] leading-relaxed">
              Our bots exclusively trade the ORB strategy. By capitalizing on early-session volatility in New York and Asian markets, we capture momentum when volume is at its highest.
            </p>
          </div>
          
          <div className="space-y-4 rounded-[32px] bg-white/60 backdrop-blur-xl p-10 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)] hover:bg-white/80 transition-colors">
            <div className="h-14 w-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-6 shadow-sm">
              <ShieldCheck size={24} weight="regular" />
            </div>
            <h3 className="text-2xl font-medium tracking-tight text-fg">Strict Risk Guardrails</h3>
            <p className="text-fg-subtle text-[15px] leading-relaxed">
              Every account is protected by server-side daily loss limits and maximum trade caps. Our systems prevent the revenge-trading and emotional spirals that destroy manual traders.
            </p>
          </div>

          <div className="space-y-4 rounded-[32px] bg-white/60 backdrop-blur-xl p-10 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)] hover:bg-white/80 transition-colors">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6 shadow-sm">
              <Lightning size={24} weight="regular" />
            </div>
            <h3 className="text-2xl font-medium tracking-tight text-fg">Instant Execution</h3>
            <p className="text-fg-subtle text-[15px] leading-relaxed">
              Our trading engine processes market data and executes orders in milliseconds, ensuring minimal slippage and precise entries exactly when breakouts occur.
            </p>
          </div>

          <div className="space-y-4 rounded-[32px] bg-white/60 backdrop-blur-xl p-10 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)] hover:bg-white/80 transition-colors">
            <div className="h-14 w-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-6 shadow-sm">
              <Info size={24} weight="regular" />
            </div>
            <h3 className="text-2xl font-medium tracking-tight text-fg">Radical Transparency</h3>
            <p className="text-fg-subtle text-[15px] leading-relaxed">
              Every trade is journaled. Every adjustment is logged. You maintain full visibility over your bot's behavior through our interactive analytics dashboard.
            </p>
          </div>
        </AboutClientMotion>

        <div className="text-center pt-24">
          <Button variant="primary" href="/dashboard" size="lg" className="rounded-[var(--radius-control)] h-12 px-8 text-[15px] font-semibold active:scale-[0.98]">
            Return to Dashboard
          </Button>
        </div>
      </section>
    </div>
  );
}
