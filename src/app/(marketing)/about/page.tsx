import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Info, ShieldCheck, Lightning, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { AboutClientMotion } from "./about-client-motion";
import { VibrantMesh } from "@/components/marketing/vibrant-mesh";

export const metadata: Metadata = { title: "About | Floqex" };

export default function AboutPage() {
  return (
    <div className="bg-base overflow-hidden selection:bg-accent/20 min-h-screen relative pb-32">
      <VibrantMesh />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 px-6">
        <div className="mx-auto max-w-[1200px] flex flex-col md:flex-row items-start justify-between gap-16 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle backdrop-blur-md mb-8 shadow-sm ring-1 ring-black/5">
              About Floqex
            </div>
            <h1 className="text-balance text-5xl font-semibold tracking-tight text-fg md:text-7xl leading-[1.05]">
              Systematic trading, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
                democratized.
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-pretty text-lg text-fg-muted md:text-xl leading-relaxed">
              We built Floqex because the gap between institutional algorithms and retail traders was too wide. No emotions, strict risk management, and mathematically proven edges.
            </p>
          </div>

          {/* Clean SVG Abstract Graphic - Apple Liquid Glass Style */}
          <div className="w-full max-w-md aspect-square relative rounded-[40px] bg-white/40 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-3xl overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 mix-blend-multiply" />
            <svg viewBox="0 0 200 200" className="w-4/5 h-4/5 drop-shadow-sm">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Grid backdrop */}
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.05)" />
              </pattern>
              <rect width="200" height="200" fill="url(#grid)" />
              
              {/* Connecting nodes */}
              <circle cx="40" cy="140" r="6" fill="var(--color-accent)" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <circle cx="100" cy="100" r="8" fill="var(--color-accent)" className="drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              <circle cx="160" cy="60" r="6" fill="var(--color-accent)" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              
              <path d="M 40 140 Q 70 140 100 100 T 160 60" fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />
              
              {/* Floating pulse ring */}
              <circle cx="100" cy="100" r="24" fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4">
                <animate attributeName="r" values="24; 36; 24" dur="4s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.3; 0; 0.3" dur="4s" repeatCount="indefinite" />
              </circle>
            </svg>
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
          <Button variant="primary" href="/dashboard" size="lg" className="rounded-full h-14 px-10 text-[16px] shadow-lg shadow-accent/20">
            Return to Dashboard
          </Button>
        </div>
      </section>
    </div>
  );
}
