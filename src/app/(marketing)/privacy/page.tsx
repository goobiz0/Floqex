import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data Floqex collects, why, and how it is protected.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="June 21, 2026"
      intro="This policy explains what we collect, why we collect it, and the choices you have. We try to collect as little as possible and to keep what we hold secure."
    >
      <LegalSection heading="What we collect">
        <p>
          Account basics come from your sign-in provider through Clerk: your name, email, and a
          profile image if you have one. As you use Floqex we store the data the product needs to
          work, such as your accounts, strategy settings, trades, and bot activity. Payment details
          are handled by Stripe; we never see your full card number.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          We use your data to run your bots, show your performance, process subscriptions, and keep
          the service secure. We do not sell your personal data, and we do not use your trading
          activity to train models for anyone else.
        </p>
      </LegalSection>

      <LegalSection heading="Broker credentials">
        <p>
          Live broker API keys are encrypted at rest and are only decrypted inside the trading
          engine to place orders. They are never returned to your browser and never shown again
          after you enter them.
        </p>
      </LegalSection>

      <LegalSection heading="Processors we rely on">
        <p>
          We share data only with the services that make Floqex run: Clerk for authentication,
          Stripe for billing, Supabase for the database, and Vercel for hosting. Each processes data
          on our behalf under its own security commitments.
        </p>
      </LegalSection>

      <LegalSection heading="Your choices">
        <p>
          You can update your profile from settings, export your trades as CSV, and delete your
          account, which removes your associated data. For any privacy request, email{" "}
          <a href="mailto:privacy@floqex.com">privacy@floqex.com</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
