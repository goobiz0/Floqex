import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Floqex.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="June 21, 2026"
      intro="These terms govern your access to and use of Floqex. By creating an account you agree to them. Please read the risk disclosure as well, since trading carries real risk of loss."
    >
      <LegalSection heading="What Floqex is">
        <p>
          Floqex is software that automates a trading strategy on accounts you connect. It is a
          tool, not a broker, a fund, or a financial adviser. We do not hold your money, take
          custody of your assets, or guarantee any outcome. Paper accounts use real market data
          with simulated execution; live accounts route orders through the broker you connect.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          You are responsible for keeping your credentials secure and for all activity under your
          account. You must be old enough to enter a contract in your jurisdiction, and you may not
          use Floqex where doing so would break the law or your broker&apos;s terms.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Do not attempt to break, overload, or reverse engineer the platform, interfere with other
          users, or use Floqex to manipulate markets. We may suspend accounts that put the service
          or other users at risk.
        </p>
      </LegalSection>

      <LegalSection heading="Trading risk">
        <p>
          Automated strategies can and do lose money. Risk controls reduce exposure but cannot
          eliminate loss, and past performance never guarantees future results. You decide whether
          to trade live and with how much. You accept full responsibility for those decisions.
        </p>
      </LegalSection>

      <LegalSection heading="Subscriptions and billing">
        <p>
          Paid plans are billed in advance through Stripe and renew until you cancel. You can manage
          or cancel a subscription at any time from the billing page; access continues until the end
          of the paid period. Fees already incurred are non-refundable except where required by law.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimers and liability">
        <p>
          Floqex is provided on an as-is basis without warranties of any kind. To the extent the law
          allows, we are not liable for trading losses or for indirect or consequential damages, and
          our total liability is limited to the fees you paid in the prior three months.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and contact">
        <p>
          We may update these terms as the product evolves and will revise the date above when we do.
          Questions can go to <a href="mailto:hello@floqex.com">hello@floqex.com</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
