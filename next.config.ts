import type { NextConfig } from "next";

const cspHeader = `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://clerk.floqex.com https://floqex.com https://app.floqex.com https://users.floqex.com https://challenges.cloudflare.com https://js.stripe.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://img.clerk.com https://github.com https://avatars.githubusercontent.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src https://challenges.cloudflare.com https://js.stripe.com; connect-src 'self' https://clerk.floqex.com https://floqex.com https://app.floqex.com https://users.floqex.com wss://ws.pusherapp.com https://api.stripe.com https://cloudflareinsights.com; worker-src 'self' blob:; upgrade-insecure-requests;`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PROXY_URL: "", // Force disable proxy to prevent Cloudflare blocks
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  serverExternalPackages: ["@prisma/client"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
