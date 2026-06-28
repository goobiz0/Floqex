import { faqs } from "./home/faq-data";

// Server-rendered JSON-LD for the marketing landing page. Helps search engines
// build rich results (app card + FAQ rich snippet) and reinforces brand entity
// signals. Real product data only, no inflated claims.

const SITE = "https://floqex.com";

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Floqex",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: SITE,
  description:
    "Connect a broker, configure a strategy, and let a bot trade for you with hard risk limits and a fully transparent decision log.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free paper-trading plan with no time limit.",
  },
};

const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
