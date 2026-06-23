export const DOCS_INDEX = [
  {
    href: "/docs",
    title: "Getting Started",
    iconName: "RocketLaunch",
    sections: [
      { heading: "The Autonomous Trading Engine", content: "Floqex is an institutional-grade, zero-emotion execution platform. We specialize exclusively in the Opening Range Breakout (ORB) strategy." },
      { heading: "Why Algorithmic Execution?", content: "The Human Problem: Fear causes early exits from winning trades. Greed causes ignored take-profit targets. Hope causes blown accounts on losing trades. The Floqex Solution: Instant execution on valid signals. Unemotional stop-loss enforcement. Precision scale-outs and trailing stops." },
      { heading: "System Architecture", content: "Market Schedule Synchronization: The engine wakes up pre-market, checks broker balances, and validates API keys. At 9:30 AM EST, the ORB formation period begins exactly on the bell. Data Ingestion & Pricing: Our servers ingest institutional-grade Level 1 consolidated market data (SIP) in real-time via WebSockets. The Execution Layer: When a strategy signal triggers, the Execution Engine decrypts your API keys in memory, formats a FIX/REST payload, and submits an OCO (One-Cancels-Other) bracket order to your broker instantly." }
    ]
  },
  {
    href: "/docs/strategy",
    title: "ORB Strategy",
    iconName: "Strategy",
    sections: [
      { heading: "Opening Range Breakout (ORB)", content: "The Opening Range Breakout (ORB) strategy is the core mathematical edge that Floqex is built upon. It exploits the massive institutional liquidity and price discovery that occurs during the first hour of the New York trading session." },
      { heading: "Mechanical Rules of Engagement", content: "Identify the Range: The algorithm records the absolute High and absolute Low of the asset during the specified Opening Range (e.g., the first 15 minutes). Confirm the Breakout: When the price closes outside of the established range, the bot checks relative volume (RVOL). If RVOL exceeds 1.5x the 20-period average, the breakout is considered valid. Risk & Reward: Simultaneous to the entry, an OCO (One-Cancels-Other) bracket is placed. The Stop Loss is set below the breakout candle's low, and the Take Profit is set at exactly 2x the risk amount." },
      { heading: "Optimal Range Durations", content: "Different volatility regimes require different range lengths. 5 Minutes: High Volatility (VIX > 25), Lower Win Rate, Prone to Fakeouts. 15 Minutes: Normal Markets (Sweet Spot), 58% Win Rate, Medium Risk. 30 Minutes: Low Volatility / Chop, 65% Win Rate, Low Risk." },
      { heading: "Time Decay Guards", content: "The best setups occur when the market has maximum liquidity and momentum. This is why Floqex utilizes strict Time Decay Guards. By default, the bot stops looking for new entries after 11:00 AM EST. Volume naturally drops during the midday lunch hour, leading to choppy, mean-reverting price action which is mathematically hostile to breakout strategies." }
    ]
  },
  {
    href: "/docs/risk",
    title: "Risk Management",
    iconName: "ShieldCheck",
    sections: [
      { heading: "Defense First", content: "The most important aspect of trading is not the entry, but the risk. Floqex enforces ironclad guardrails that prevent emotional blow-ups and protect your capital." },
      { heading: "The Circuit Breaker (Max Daily Drawdown)", content: "If your account loses a specified percentage in a single day (default 3%), the bot will automatically HARD STOP. It cancels all pending orders and will refuse to take any more trades until the next session. This is the ultimate defense against market chops and revenge trading." },
      { heading: "Expectancy & Risk Calculator", content: "Average expected profit per trade over a large sample size based on win rate and R:R." },
      { heading: "Position Sizing Mathematics", content: "Dynamic Share Sizing: You define the exact percentage you are willing to lose. The bot calculates the position size dynamically based on the distance from the entry price to the stop loss. Shares = (Account * Risk%) / (Entry - Stop)." },
      { heading: "Automatic Stop Losses", content: "Every order sent to the broker includes a hard stop loss via an OCO bracket. If the broker API disconnects or your internet goes down, your stop is already resting on their exchange servers. 100% Exchange-Side Protection." }
    ]
  },
  {
    href: "/docs/brokers",
    title: "Brokers & Connections",
    iconName: "CreditCard",
    sections: [
      { heading: "Live Execution", content: "Transitioning from Paper to Live trading requires connecting a supported brokerage account. Floqex uses secure, encrypted API keys to execute trades directly on your behalf without ever touching your funds." },
      { heading: "Supported Integrations", content: "Alpaca Markets: Commission-free API trading. Best for US Equities. We fully support Alpaca's REST v2 API, including OCO (One-Cancels-Other) bracket orders and fractional shares. TradeStation: Advanced institutional-grade routing for Equities and Futures. Deep integration is currently in beta testing for our professional users." },
      { heading: "How We Secure Your Keys", content: "AES-256-GCM Encryption: The moment you paste your API keys into the dashboard, they are encrypted client-side and then re-encrypted at rest in our database using industry-standard AES-256-GCM. Our front-end cannot read your keys once they are saved. In-Memory Decryption: Keys are only ever decrypted in-memory inside the secure execution enclave at the exact moment a trade signal is generated. They are never logged or stored in plain text anywhere on our servers." },
      { heading: "Connection Guide (Alpaca)", content: "1. Upgrade to Trader Plan: Live broker connections are only available on paid tiers. 2. Generate API Keys: Log into your Alpaca dashboard. Create new keys. Crucial: Ensure keys have Trade permissions but NO Transfer/Withdrawal permissions. 3. Paste into Floqex: Go to the Accounts Dashboard. Click Connect Live Account and input your newly generated Key ID and Secret." }
    ]
  },
  {
    href: "/docs/glossary",
    title: "Glossary",
    iconName: "BookBookmark",
    sections: [
      { heading: "P&L (Profit and Loss)", content: "The total realized and unrealized gain or loss of an account or position." },
      { heading: "RVOL (Relative Volume)", content: "The current volume traded compared to its historical average. High RVOL confirms the strength of a breakout." },
      { heading: "OCO (One-Cancels-Other)", content: "A pair of orders stipulating that if one order executes, the other is automatically canceled. Used for sending stop-loss and take-profit targets simultaneously." },
      { heading: "Slippage", content: "The difference between the expected price of a trade and the price at which the trade is executed, often occurring during periods of high volatility." },
      { heading: "VIX", content: "The CBOE Volatility Index, a popular measure of the stock market's expectation of volatility based on S&P 500 index options." },
      { heading: "Paper Trading", content: "Simulated trading that allows investors to practice buying and selling securities without risking real money." }
    ]
  }
];
