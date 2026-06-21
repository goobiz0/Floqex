import type { MetadataRoute } from "next";

const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
const base = new URL(root?.startsWith("http") ? root : `https://${root ?? "floqex.com"}`).origin;

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
