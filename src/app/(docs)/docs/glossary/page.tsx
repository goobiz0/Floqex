"use client";

import { useState } from "react";
import { BookBookmark, MagnifyingGlass } from "@phosphor-icons/react";
import { motion } from "motion/react";

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
      <motion.header variants={itemVariants} className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <BookBookmark size={14} weight="duotone" />
          Terminology
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-fg">Trading Glossary</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed max-w-2xl">
          Master the terminology used in algorithmic trading and the Floqex platform.
        </p>
      </motion.header>

      <motion.section variants={itemVariants} className="space-y-6 mt-8">
        <div className="relative max-w-md">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" size={18} weight="bold" />
          <input 
            type="text" 
            placeholder="Search terms..." 
            className="w-full bg-surface border border-line rounded-[var(--radius-control)] pl-11 pr-4 py-3 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTerms.map(item => (
            <motion.div 
              key={item.term} 
              layout
              className="bg-surface border border-line rounded-[var(--radius-card)] p-6 hover:border-accent/50 hover:shadow-[0_0_15px_rgba(var(--color-accent),0.05)] transition-all group"
            >
              <h3 className="text-lg font-semibold text-fg group-hover:text-accent transition-colors">{item.term}</h3>
              <p className="mt-3 text-sm text-fg-subtle leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
          {filteredTerms.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-12 text-center text-fg-muted border border-dashed border-line rounded-[var(--radius-card)] bg-base/50"
            >
              <BookBookmark size={32} className="mx-auto mb-3 opacity-20" />
              No terminology found matching &quot;<span className="text-fg font-medium">{search}</span>&quot;.
            </motion.div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
