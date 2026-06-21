import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Risk Disclosure",
  description: "An honest statement of the risks of automated and leveraged trading.",
};

export default function RiskDisclosurePage() {
  return (
    <LegalShell
      title="Risk Disclosure"
      updated="June 21, 2026"
      intro="Trading is risky. This page is the plain-language version of that fact. Read it before you connect a live account, and never trade money you cannot afford to lose."
    >
      <LegalSection heading="You can lose money">
        <p>
          Automated strategies lose trades, string losses together, and can have losing months.
          Floqex enforces the risk limits you set, but limits cap how much you risk per trade and
          per day. They do not promise a profit or prevent a drawdown.
        </p>
      </LegalSection>

      <LegalSection heading="Leverage magnifies both directions">
        <p>
          Futures and similar instruments use leverage, so a small move in the market is a large
          move in your account. Leverage that grows a winner just as quickly deepens a loser. Size
          your risk with that in mind.
        </p>
      </LegalSection>

      <LegalSection heading="Past results do not predict the future">
        <p>
          Backtests and historical equity curves describe what already happened under conditions
          that may never repeat. A strategy that worked last quarter can stop working this one.
          Treat any past number as context, not a forecast.
        </p>
      </LegalSection>

      <LegalSection heading="Paper trading is not live trading">
        <p>
          Paper accounts use real prices and simulated fills, which is the honest way to test a bot
          with no money at stake. Live markets add slippage, partial fills, fees, and the emotional
          weight of real money. Results will differ.
        </p>
      </LegalSection>

      <LegalSection heading="Floqex is software, not advice">
        <p>
          Floqex does not recommend trades, manage money, or act as a broker or adviser. You choose
          whether to trade, which strategy to run, and how much to risk. Those decisions, and their
          outcomes, are yours.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
