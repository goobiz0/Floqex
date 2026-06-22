import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Risk Disclosures",
  description: "Important disclosures regarding the risks of automated trading.",
};

export default function RiskPage() {
  return (
    <LegalShell
      title="Risk Disclosures"
      updated="June 22, 2026"
      intro="Trading in financial markets carries a high level of risk and may not be suitable for all investors. Before deciding to trade, you should carefully consider your investment objectives, level of experience, and risk appetite."
    >
      <LegalSection heading="1. Substantial Risk of Loss">
        <p>
          The possibility exists that you could sustain a loss of some or all of your initial investment and therefore you should not invest money that you cannot afford to lose. You should be aware of all the risks associated with foreign exchange, cryptocurrency, options, and equity trading, and seek advice from an independent financial advisor if you have any doubts.
        </p>
      </LegalSection>

      <LegalSection heading="2. CFTC Rule 4.41 Disclaimer">
        <p>
          <strong>Hypothetical or simulated performance results have certain limitations.</strong> Unlike an actual performance record, simulated results do not represent actual trading. Also, since the trades have not been executed, the results may have under-or-over compensated for the impact, if any, of certain market factors, such as lack of liquidity.
        </p>
        <p className="mt-2">
          Simulated trading programs in general are also subject to the fact that they are designed with the benefit of hindsight. No representation is being made that any account will or is likely to achieve profit or losses similar to those shown in any Floqex marketing materials or paper trading environments.
        </p>
      </LegalSection>

      <LegalSection heading="3. Automated Trading Software Risks">
        <p>
          Floqex provides software to automate trading strategies. The use of automated trading systems involves inherent risks, including but not limited to:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Software Bugs & Errors:</strong> Algorithms may contain logic errors or unexpected behavior during anomalous market conditions.</li>
          <li><strong>Infrastructure Failures:</strong> Server outages, internet connectivity issues, or cloud provider downtime could result in missed signals or stuck positions.</li>
          <li><strong>Broker API Limitations:</strong> Floqex relies on third-party brokerage APIs. We cannot guarantee uptime, execution speed, or fill quality. API rate limits or broker-side maintenance may prevent your bots from entering or exiting trades.</li>
        </ul>
        <p className="mt-2">
          Floqex is not liable for any losses incurred due to software malfunctions, connectivity drops, or execution failures.
        </p>
      </LegalSection>

      <LegalSection heading="4. No Financial Advice">
        <p>
          Any opinions, news, research, analyses, prices, or other information contained on this website or provided by the Floqex platform are provided as general market commentary, and do not constitute investment advice. Floqex will not accept liability for any loss or damage, including without limitation to, any loss of profit, which may arise directly or indirectly from use of or reliance on such information.
        </p>
      </LegalSection>

      <LegalSection heading="5. Market Volatility & Liquidity">
        <p>
          During periods of high market volatility or low liquidity, the price at which your trades are executed may be significantly different from the price at which the signal was generated (slippage). Floqex does not guarantee execution prices and is not responsible for losses resulting from market volatility or illiquidity.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
