// Shared FAQ content so the visible accordion (faq-section.tsx) and the
// FAQPage JSON-LD (structured-data.tsx) stay in sync from a single source.
export const faqs: { q: string; a: string }[] = [
  {
    q: "What brokers does Floqex support?",
    a: "Floqex connects to OANDA, Interactive Brokers, Tradovate, Alpaca and Coinbase. You link your existing broker account and the engine places orders directly there. Your funds never leave your broker.",
  },
  {
    q: "Is my broker account safe?",
    a: "Floqex never holds your money or has withdrawal access. The connection uses read and trade permissions only. You can revoke access from your broker at any time, and the emergency stop shuts everything down instantly.",
  },
  {
    q: "Do I need to know how to code?",
    a: "Not at all. The strategy builder is visual: you compose conditions as blocks, set your risk parameters with sliders and inputs, and the engine handles execution. No scripting, no broker SDKs.",
  },
  {
    q: "What happens if I lose internet?",
    a: "Your bots run on Floqex infrastructure, not on your machine. If your connection drops, the engine keeps executing and enforcing your risk limits. You can check back any time to see what happened in the agent feed.",
  },
  {
    q: "Can I paper trade before going live?",
    a: "Yes. The free plan gives you a full paper trading environment with no time limit. You get the same dashboard, journal, analytics and agent feed as live traders, just on simulated fills.",
  },
  {
    q: "How does the risk engine work?",
    a: "You set a maximum daily drawdown, a per-trade risk percentage, and a maximum number of trades per session. The engine enforces these limits on every order and will pause the bot if any limit is hit.",
  },
  {
    q: "Can I run multiple bots at once?",
    a: "Yes, depending on your plan. The free plan supports one bot. Trader supports up to 3, Pro up to 10, and Elite up to 25 concurrent bots across multiple accounts and instruments.",
  },
  {
    q: "What markets can I trade?",
    a: "Forex, US equities, futures and crypto, depending on which broker you connect. The engine supports any instrument your broker offers. Market hours and sessions are tracked automatically.",
  },
];
