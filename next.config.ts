import type { NextConfig } from "next";

const cspHeader = `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://clerk.floqex.com https://floqex.com https://app.floqex.com https://users.floqex.com https://challenges.cloudflare.com https://js.stripe.com https://static.cloudflareinsights.com https://floqex1.statuspage.io; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://img.clerk.com https://github.com https://avatars.githubusercontent.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src https://challenges.cloudflare.com https://js.stripe.com https://ny8q3qqhsy7j.statuspage.io/; connect-src 'self' https://clerk.floqex.com https://floqex.com https://app.floqex.com https://users.floqex.com wss://ws.pusherapp.com https://api.stripe.com https://cloudflareinsights.com https://floqex1.statuspage.io; worker-src 'self' blob:; upgrade-insecure-requests;`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PROXY_URL: "", // Force disable proxy to prevent Cloudflare blocks
  },
  images: {
    // Serve AVIF first, then WebP, falling back to the original. This shrinks
    // every next/image payload (Clerk/GitHub avatars and any first-party art)
    // without touching call sites.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    // Cache visited route segments on the client so switching back to a
    // recently-opened dashboard tab is instant instead of re-fetching the RSC
    // payload (and flashing the loading skeleton) every time. Next 16 defaults
    // the dynamic stale time to 0, which is why tab switching felt slow.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Tree-shake the large icon/animation packages so each route ships only the
    // icons it actually uses, cutting bundle size and time-to-interactive.
    optimizePackageImports: ["@phosphor-icons/react", "motion", "recharts"],
  },
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
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

// Opt-in bundle analysis: run `ANALYZE=true npm run build` to emit the treemap
// report. The dependency is only required when analysing, so a normal build
// never needs it installed.
let withConfig = (config: NextConfig): NextConfig => config;
if (process.env.ANALYZE === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  withConfig = require("@next/bundle-analyzer")({ enabled: true });
}

export default withConfig(nextConfig);
