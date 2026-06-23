export const metadata = {
  title: "Docs | Floqex",
  description: "Official documentation for the Floqex algorithmic trading platform.",
};

export default function DocsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Welcome to Floqex</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          The autonomous, zero-emotion trading system that executes the Opening Range Breakout (ORB) strategy. This documentation will guide you through setting up your account, understanding the strategy, and navigating the strict risk parameters.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Why Floqex?</h2>
        <p className="text-fg-subtle leading-relaxed">
          Algorithmic trading removes the emotional burden of discretionary trading. By automating a statistically proven edge—the ORB—Floqex ensures that your account only takes high-probability setups at the open, while strictly managing risk on every trade.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Quick Start</h2>
        <div className="grid gap-4 mt-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-fg">1. Paper Trading</h3>
            <p className="mt-2 text-sm text-fg-subtle">
              Every new account comes with a $10,000 simulated balance. Connect your Discord and watch the bot trade live market data risk-free.
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-fg">2. Upgrading to Live</h3>
            <p className="mt-2 text-sm text-fg-subtle">
              Once you are comfortable with the strategy, upgrade to the Trader plan to connect your live broker via secure API keys.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">How it works</h2>
        <ul className="list-disc list-inside space-y-2 text-fg-subtle">
          <li><strong>Pre-market:</strong> The bot analyzes volatility and pre-market highs/lows.</li>
          <li><strong>The Open:</strong> The Opening Range is defined (first 15 or 30 minutes).</li>
          <li><strong>The Breakout:</strong> If price breaks the range with volume, the bot enters.</li>
          <li><strong>Risk Guardrails:</strong> Stop losses and daily drawdowns are enforced instantly.</li>
        </ul>
      </section>
    </div>
  );
}
