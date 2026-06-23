export const metadata = {
  title: "Glossary | Floqex Docs",
  description: "Trading terminology used throughout the Floqex platform.",
};

export default function GlossaryPage() {
  const terms = [
    {
      term: "Opening Range Breakout (ORB)",
      definition: "A day trading strategy that involves taking a position when the price breaks above or below the high/low of a specific time period immediately following the market open (usually the first 15 or 30 minutes)."
    },
    {
      term: "Drawdown",
      definition: "The peak-to-trough decline of an account's equity. A 'Daily Drawdown Limit' is a strict rule that halts trading if the account loses a specific dollar amount in a single day."
    },
    {
      term: "Paper Trading",
      definition: "Simulated trading using fake money in a real-time market environment. It is used to test strategies and platforms without financial risk."
    },
    {
      term: "Take Profit (TP)",
      definition: "An order type used to automatically close a profitable position once the asset hits a specific price."
    },
    {
      term: "Stop Loss (SL)",
      definition: "An order type designed to limit an investor's loss on a position in a security. It automatically triggers a market order to sell if the price falls to a specified level."
    },
    {
      term: "R-Multiple",
      definition: "A way to measure performance in terms of the initial risk taken. If you risk $100 on a trade and make $250, your profit is 2.5R."
    },
    {
      term: "Slippage",
      definition: "The difference between the expected price of a trade and the price at which the trade is actually executed. Often occurs during periods of high volatility, like the market open."
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Glossary</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          A dictionary of common trading and algorithmic terms you will encounter while using Floqex.
        </p>
      </header>

      <section className="space-y-6 mt-8">
        {terms.map((item, i) => (
          <div key={i} className="border-b border-line pb-6 last:border-0">
            <h3 className="text-xl font-semibold text-fg">{item.term}</h3>
            <p className="mt-2 text-fg-subtle leading-relaxed">{item.definition}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
