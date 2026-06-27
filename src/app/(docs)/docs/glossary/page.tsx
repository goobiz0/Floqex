"use client";

import { motion } from "motion/react";

const GLOSSARY_TERMS = [
  { term: "Opening Range (OR)", definition: "The high and low price established during the first N minutes (typically 15) of a trading session. This range serves as support and resistance." },
  { term: "Opening Range Breakout (ORB)", definition: "A strategy that enters a trade when the price breaks out (closes outside) of the Opening Range." },
  { term: "R-Multiple", definition: "A standardized measure of risk and reward. 1R represents the initial risk taken on a trade. A trade that makes twice the initial risk is a +2R trade." },
  { term: "MFE (Maximum Favorable Excursion)", definition: "The peak profit a trade reached before it was closed. Used to determine if take-profit targets are too conservative or too aggressive." },
  { term: "MAE (Maximum Adverse Excursion)", definition: "The maximum loss a trade experienced before it was closed. Used to determine if stop-losses are placed too tightly." },
  { term: "Drawdown", definition: "The peak-to-trough decline during a specific record period of an investment, usually quoted as the percentage between the peak and the subsequent trough." },
  { term: "Expectancy", definition: "The average amount you can expect to win (or lose) per trade, combining win rate and average win/loss sizes. Positive expectancy means a strategy is profitable over time." },
  { term: "Profit Factor", definition: "The gross profit divided by the gross loss over a specific trading period. A profit factor above 1.0 indicates a profitable system." },
  { term: "Slippage", definition: "The difference between the expected price of a trade and the price at which the trade is actually executed. Floqex paper trading applies a simulated 0.02% slippage penalty." },
];

export default function GlossaryPage() {
  return (
    <div className="space-y-16">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Glossary
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted leading-relaxed">
          Common terminology used within the Floqex platform and algorithmic trading.
        </p>
      </motion.header>

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        <dl className="grid gap-6 md:grid-cols-2">
          {GLOSSARY_TERMS.map((item, index) => (
            <div key={index} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <dt className="text-lg font-semibold text-fg mb-2">{item.term}</dt>
              <dd className="text-sm text-fg-muted leading-relaxed">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </motion.section>

    </div>
  );
}
