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
      updated="June 22, 2026"
      intro="This Privacy Policy describes how Floqex ('we', 'our', or 'us') collects, uses, processes, and shares your personal information. By using our Services, you agree to the collection and use of information in accordance with this Privacy Policy."
    >
      <LegalSection heading="1. Information We Collect">
        <p>
          We collect information that identifies, relates to, describes, or could reasonably be linked, directly or indirectly, with a particular consumer or device ("Personal Information"). We collect this information directly from you, automatically through your use of our Services, and from third-party sources.
        </p>
        <p><strong>1.1 Information You Provide Directly:</strong></p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Account Information:</strong> Name, email address, password, and profile picture (facilitated via our authentication provider, Clerk).</li>
          <li><strong>Financial & Brokerage Information:</strong> API keys for connected brokerage accounts. These are encrypted at rest and used strictly for automated trade execution on your behalf. We do not store your full payment card details; payments are processed securely by Stripe.</li>
          <li><strong>Communications:</strong> Information you provide when contacting our support team or participating in surveys.</li>
        </ul>
        <p className="mt-4"><strong>1.2 Information Collected Automatically:</strong></p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Device & Usage Data:</strong> IP addresses, browser type, operating system, referring URLs, pages viewed, links clicked, and the dates and times of your visits.</li>
          <li><strong>Cookies & Tracking Technologies:</strong> We use cookies, web beacons, and similar technologies to remember your preferences, keep you logged in, and analyze service performance. You can control cookie preferences through your browser settings.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How We Use Your Information">
        <p>We use the Personal Information we collect for the following business purposes:</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Service Delivery:</strong> To authenticate users, connect to supported brokerages, execute automated trading strategies according to your configurations, and provide performance analytics.</li>
          <li><strong>Billing & Administration:</strong> To process payments, manage subscriptions, and send transactional notifications (e.g., billing receipts, security alerts).</li>
          <li><strong>Security & Fraud Prevention:</strong> To monitor and prevent unauthorized access, investigate fraudulent activity, and ensure the integrity of our trading engine.</li>
          <li><strong>Improvement & Analytics:</strong> To understand how users interact with our platform and improve our algorithms. We do <strong>not</strong> use your individual trading activity to train public AI models or sell your alpha.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. How We Share Your Information">
        <p>We do not sell your Personal Information. We share your information only in the following circumstances:</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Service Providers (Sub-processors):</strong> We share information with trusted third-party vendors that provide services on our behalf. These include Clerk (Authentication), Stripe (Payment Processing), Supabase (Database infrastructure), and Vercel (Hosting). These providers are contractually obligated to protect your data and only process it according to our instructions.</li>
          <li><strong>Brokerages:</strong> We transmit execution instructions via API to your connected brokerages based solely on your configured strategies.</li>
          <li><strong>Legal & Compliance:</strong> We may disclose information if required to do so by law, regulation, subpoena, or to protect the safety, rights, or property of Floqex, our users, or the public.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Data Security and Retention">
        <p>
          We implement commercially reasonable technical and organizational measures to protect your Personal Information. Crucially, all live broker API keys are encrypted at rest using industry-standard AES-256 encryption. API keys are only decrypted securely within our backend execution environment and are never exposed to the frontend or transmitted in plaintext.
        </p>
        <p className="mt-2">
          We retain your Personal Information for as long as your account is active or as needed to provide you the Services. If you delete your account, we will delete or anonymize your Personal Information, except where retention is required by law (e.g., tax and financial record-keeping).
        </p>
      </LegalSection>

      <LegalSection heading="5. Your Privacy Rights (GDPR & CCPA)">
        <p>
          Depending on your location, you may have specific rights regarding your Personal Information:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Right to Access:</strong> You can request a copy of the Personal Information we hold about you.</li>
          <li><strong>Right to Correction:</strong> You can correct inaccurate or incomplete data in your account settings.</li>
          <li><strong>Right to Deletion ("Right to be Forgotten"):</strong> You can delete your account and request the deletion of your data.</li>
          <li><strong>Right to Data Portability:</strong> You can export your trading history and strategy configurations as CSV files.</li>
          <li><strong>Right to Opt-Out:</strong> We do not sell your data. However, you can opt-out of promotional communications at any time.</li>
        </ul>
        <p className="mt-4">
          To exercise any of these rights, please contact us at <a href="mailto:privacy@floqex.com" className="text-accent hover:underline">privacy@floqex.com</a>. We will respond to your request within the timeframe required by applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="6. International Data Transfers">
        <p>
          Floqex is based in the United States. If you access our Services from outside the US, your information may be transferred to, stored, and processed in the US or other countries where our service providers operate. By using the Services, you consent to this transfer, noting that data protection laws in the US may differ from those in your jurisdiction.
        </p>
      </LegalSection>

      <LegalSection heading="7. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or through a notice on the platform prior to the change becoming effective. Your continued use of the Services constitutes acceptance of the revised policy.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
