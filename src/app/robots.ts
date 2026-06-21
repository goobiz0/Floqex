import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
  : "https://floqex.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The product and auth surfaces are per-user and dynamic; keep them out of the index.
        disallow: ["/dashboard", "/onboarding", "/sign-in", "/sign-up", "/api"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
