import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Info, ShieldCheck, Lightning, TrendUp } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "About | Floqex" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-12 space-y-16">
      <div className="text-center space-y-4 pt-12">
        <h1 className="text-4xl font-bold tracking-tight text-fg">About Floqex</h1>
        <p className="text-xl text-fg-subtle max-w-2xl mx-auto">
          We are democratizing institutional-grade algorithmic trading. No emotions, strict risk management, and mathematically proven edges.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 rounded-3xl bg-surface p-8 border border-line">
          <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center text-accent">
            <TrendUp size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-fg">Opening Range Breakouts</h3>
          <p className="text-fg-subtle leading-relaxed">
            Our bots exclusively trade the ORB strategy. By capitalizing on early-session volatility in New York and Asian markets, we capture momentum when volume is at its highest.
          </p>
        </div>
        
        <div className="space-y-4 rounded-3xl bg-surface p-8 border border-line">
          <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <ShieldCheck size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-fg">Strict Risk Guardrails</h3>
          <p className="text-fg-subtle leading-relaxed">
            Every account is protected by server-side daily loss limits and maximum trade caps. Our systems prevent the revenge-trading and emotional spirals that destroy manual traders.
          </p>
        </div>

        <div className="space-y-4 rounded-3xl bg-surface p-8 border border-line">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Lightning size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-fg">Instant Execution</h3>
          <p className="text-fg-subtle leading-relaxed">
            Our trading engine processes market data and executes orders in milliseconds, ensuring minimal slippage and precise entries exactly when breakouts occur.
          </p>
        </div>

        <div className="space-y-4 rounded-3xl bg-surface p-8 border border-line">
          <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Info size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-fg">Radical Transparency</h3>
          <p className="text-fg-subtle leading-relaxed">
            Every trade is journaled. Every adjustment is logged. You maintain full visibility over your bot's behavior through our interactive analytics dashboard.
          </p>
        </div>
      </div>

      <div className="text-center pt-8">
        <Button variant="primary" href="/dashboard" size="lg">Return to Dashboard</Button>
      </div>
    </div>
  );
}
