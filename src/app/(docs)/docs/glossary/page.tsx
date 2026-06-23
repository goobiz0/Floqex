"use client";

import { useState } from "react";
import { BookBookmark, MagnifyingGlass } from "@phosphor-icons/react";

const GLOSSARY_TERMS = [
  { term: "Alpha", desc: "The excess return of an investment relative to the return of a benchmark index." },
  { term: "ATR (Average True Range)", desc: "A technical analysis indicator that measures market volatility by decomposing the entire range of an asset price for that period." },
  { term: "Bracket Order (OCO)", desc: "One-Cancels-Other. A group of orders where the execution of one order automatically cancels the other. Used to place a stop-loss and take-profit simultaneously." },
  { term: "Drawdown", desc: "The peak-to-trough decline during a specific record period of an investment, fund, or trading account." },
  { term: "Edge", desc: "A trader's competitive advantage that results in positive expectancy over a large sample size of trades." },
  { term: "Expectancy", desc: "The mathematical formula that tells you the average amount you can expect to win (or lose) per trade based on your win rate and reward-to-risk ratio." },
  { term: "FIX Protocol", desc: "Financial Information eXchange. An electronic communications protocol initiated for real-time exchange of information related to securities transactions." },
  { term: "MCP", desc: "Model Context Protocol. The secure architecture allowing AI agents to interface directly with Floqex." },
  { term: "ORB (Opening Range Breakout)", desc: "A day trading strategy that involves taking a position when the price breaks above or below the high/low of the first X minutes of the trading day." },
  { term: "R-Multiple", desc: "A way to measure the performance of a trade as a multiple of the initial risk. A 2R trade means the profit was twice the initial dollar amount risked." },
  { term: "Slippage", desc: "The difference between the expected price of a trade and the price at which the trade is actually executed. Usually occurs during high volatility." },
  { term: "Webhook", desc: "A method of augmenting or altering the behavior of a web page or web application with custom callbacks. Used in Floqex to route data to Make.com or Zapier." }
];

export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  
  const filteredTerms = GLOSSARY_TERMS.filter(item => 
    item.term.toLowerCase().includes(search.toLowerCase()) || 
    item.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <BookBookmark size={14} weight="bold" />
          Terminology
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Trading Glossary</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          Master the terminology used in algorithmic trading and the Floqex platform.
        </p>
      </header>

      </section>
    </div>
  );
}
