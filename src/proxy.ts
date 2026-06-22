import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next.js 16 renames `middleware` to `proxy` (Node runtime). Clerk runs here.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

// Auth routes that live natively on users.floqex.com.
const AUTH_PREFIXES = ["/sign-in", "/sign-up", "/forgot-password", "/sso-callback"];

/**
 * Resolve the role of a host from its subdomain.
 *  - users.*                      → "auth"    (the custom Clerk sign-in surface)
 *  - accounts.* / dashboard.*     → "product" (the account dashboard; accounts.* is
 *                                   canonical, dashboard.* kept as a working alias)
 * Returns "" for the apex domain, localhost, and preview hosts so path-based
 * routing keeps working everywhere except the real subdomains.
 */
function hostRole(host: string): "auth" | "product" | "" {
  const h = host.split(":")[0].toLowerCase();
  if (h.endsWith("localhost")) return "";
  const parts = h.split(".");
  if (parts.length < 3) return ""; // apex like floqex.com
  const sub = parts[0];
  if (sub === "users") return "auth";
  if (sub === "accounts" || sub === "dashboard") return "product";
  return "";
}

// Trusted origins for Clerk's authorized-parties (azp) check. Hardens against
// CSRF / cookie-leak from a compromised sibling subdomain. Only set in prod
// where the root domain is known; pair with "Allowed Subdomains" in Clerk.
const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
const authorizedParties = root
  ? [
      `https://${root}`,
      `https://www.${root}`,
      `https://users.${root}`,
      `https://accounts.${root}`,
      `https://dashboard.${root}`,
    ]
  : undefined;

export default clerkMiddleware(
  async (auth, req) => {
    const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
    const url = req.nextUrl;
    const { pathname } = url;

    // Proxy Clerk's frontend API (FAPI) requests natively to avoid 404s and CORS issues.
    if (pathname.startsWith("/v1/client") || pathname.startsWith("/npm")) {
      const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
      let fapiUrl = "";
      if (pk.startsWith("pk_test_")) {
        const decoded = atob(pk.split("_")[2]);
        const fapiDomain = decoded.slice(0, -1); // remove trailing $
        fapiUrl = `https://${fapiDomain}${pathname}${url.search}`;
      } else if (pk.startsWith("pk_live_") && root) {
        fapiUrl = `https://clerk.${root}${pathname}${url.search}`;
      }

      if (fapiUrl) {
        const origin = req.headers.get("origin") || "*";
        
        // Handle CORS preflight explicitly
        if (req.method === "OPTIONS") {
          return new NextResponse(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization, x-clerk-cljs-version, x-clerk-js-version",
              "Access-Control-Allow-Credentials": "true",
            },
          });
        }

        try {
          // Clone headers to pass upstream, but remove host
          const headers = new Headers(req.headers);
          headers.delete("host");
          
          const requestInit: RequestInit & { duplex?: string } = {
            method: req.method,
            headers,
            redirect: "follow", // Follow redirects under the hood
          };
          
          if (req.method !== "GET" && req.method !== "HEAD") {
            // Only pass body if present, to avoid fetch throwing errors
            if (req.body) {
              requestInit.body = req.body as any;
              requestInit.duplex = "half";
            }
          }
          
          const res = await fetch(fapiUrl, requestInit);
          
          // Clean up headers before returning to prevent stream corruption
          const responseHeaders = new Headers(res.headers);
          responseHeaders.delete("content-encoding");
          responseHeaders.delete("content-length");
          
          // Create response from upstream
          const proxiedRes = new NextResponse(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: responseHeaders,
          });
          
          // Force CORS headers on the proxy response
          proxiedRes.headers.set("Access-Control-Allow-Origin", origin);
          proxiedRes.headers.set("Access-Control-Allow-Credentials", "true");
          
          return proxiedRes;
        } catch (error) {
          // Fallback to Next.js rewrite if fetch fails
          return NextResponse.rewrite(fapiUrl);
        }
      }
    }

    const role = hostRole(host);

    // ── accounts.floqex.com (and dashboard.* alias) — the product, protected ──
    if (role === "product") {
      // API routes authenticate themselves (e.g. the Clerk webhook verifies a
      // signature), so never gate them behind a session here.
      if (pathname.startsWith("/api")) return NextResponse.next();

      await auth.protect();

      // Clean product URLs: accounts.floqex.com/journal -> /dashboard/journal.
      // Leave the already-namespaced product tree and onboarding untouched.
      if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/onboarding")) {
        const rewritten = url.clone();
        rewritten.pathname = `/dashboard${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(rewritten);
      }
      return NextResponse.next();
    }

    // ── users.floqex.com — auth only ──
    if (role === "auth") {
      const isAuthPath = AUTH_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );

      // Signed-in users on auth pages → redirect to the product (accounts) host.
      if (pathname === "/" || isAuthPath) {
        const { userId } = await auth();
        if (userId) {
          return NextResponse.redirect(`https://accounts.${root}/`);
        }
      }

      if (pathname === "/") {
        const rewritten = url.clone();
        rewritten.pathname = "/sign-in";
        return NextResponse.rewrite(rewritten);
      }
      if (!isAuthPath && !pathname.startsWith("/api")) {
        const redirect = url.clone();
        redirect.pathname = "/sign-in";
        return NextResponse.redirect(redirect);
      }
      return NextResponse.next();
    }

    // ── apex / localhost / previews — path-based routing ──
    // Signed-in users on auth pages → redirect to /dashboard.
    const isAuthRoute = AUTH_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (isAuthRoute) {
      const { userId } = await auth();
      if (userId) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if (isProtectedRoute(req)) {
      await auth.protect();
    }
    return NextResponse.next();
  },
  {
    authorizedParties: authorizedParties ? authorizedParties : undefined,
    proxyUrl: root ? `https://www.${root}` : undefined,
  }
);

export const config = {
  matcher: [
    // Ensure the Clerk proxy paths are ALWAYS processed by middleware, even if they end in .js
    "/v1/client/(.*)",
    "/npm/(.*)",
    // Skip Next internals and static files, run on everything else
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
