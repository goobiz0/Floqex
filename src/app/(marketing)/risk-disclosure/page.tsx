import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Risk Disclosure",
  description: "Important disclosures regarding the risks of automated algorithmic trading.",
};

export default function RiskDisclosurePage() {
  return (
    <LegalShell
      title="Risk Disclosure Statement"
      updated="June 23, 2026"
      intro="Trading financial instruments, including equities, options, and futures, involves a high degree of risk and may not be suitable for all investors. Please carefully read this disclosure before using the Floqex platform."
    >
      <LegalSection heading="1. High Risk Investment">
        <p>
          Trading in financial markets carries a substantial risk of loss. You should carefully consider whether trading is suitable for you in light of your circumstances, knowledge, and financial resources. You may lose all or more of your initial investment. Opinions, market data, and recommendations are subject to change at any time.
        </p>
      </LegalSection>

      <LegalSection heading="2. Algorithmic and Automated Trading Risks">
        <p>
          The Floqex platform allows you to automate trading strategies via third-party brokerage APIs. Automated trading involves significant technological risks, including, but not limited to:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>System Failures:</strong> Software bugs, hardware failures, or internet connectivity issues can cause the bot to fail to execute a trade, duplicate a trade, or execute it at an unintended price.</li>
          <li><strong>API Latency:</strong> Delays in data transmission between Floqex and your connected broker can lead to massive slippage, especially during the volatile market open when the Opening Range Breakout (ORB) strategy is active.</li>
          <li><strong>Runaway Algorithms:</strong> An improperly configured bot or a system anomaly could result in rapid, consecutive losing trades before risk-management protocols (like daily drawdown limits) can intercept them.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Hypothetical and Past Performance">
        <p className="bg-warning-soft p-3 rounded-[var(--radius-control)] border border-warning/20 font-medium">
          <strong>CFTC RULE 4.41:</strong> HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN LIMITATIONS. UNLIKE AN ACTUAL PERFORMANCE RECORD, SIMULATED RESULTS DO NOT REPRESENT ACTUAL TRADING. ALSO, SINCE THE TRADES HAVE NOT BEEN EXECUTED, THE RESULTS MAY HAVE UNDER-OR-OVER COMPENSATED FOR THE IMPACT, IF ANY, OF CERTAIN MARKET FACTORS, SUCH AS LACK OF LIQUIDITY. NO REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL OR IS LIKELY TO ACHIEVE PROFIT OR LOSSES SIMILAR TO THOSE SHOWN.
        </p>
        <p className="mt-4">
          Any performance statistics, backtests, or historical data presented on the Floqex website are purely hypothetical. Past performance of any trading system or methodology is not necessarily indicative of future results.
        </p>
      </LegalSection>

      <LegalSection heading="4. Leverage and Margin">
        <p>
          If your connected brokerage account is approved for margin, you may be trading with leverage. Leverage can work against you as well as for you. It magnifies both profits and losses. A relatively small market movement will have a proportionately larger impact on the funds you have deposited, which may work against you and lead to total loss of margin funds or require you to deposit additional funds on short notice.
        </p>
      </LegalSection>

      <LegalSection heading="5. No Investment Advice">
        <p>
          Floqex provides technology. We do not provide investment, financial, tax, or legal advice. None of the content, features, or materials on the platform should be construed as a recommendation to buy, sell, or hold any financial instrument or to engage in any specific trading strategy.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
