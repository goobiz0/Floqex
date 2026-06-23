import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Force-delete bad environment variables so Clerk's internal SDK cannot read them
delete process.env.NEXT_PUBLIC_CLERK_DOMAIN;
delete process.env.CLERK_DOMAIN;
delete process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL;
delete process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE;

// Next.js 16 renames `middleware` to `proxy` (Node runtime). Clerk runs here.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

// Auth routes
const AUTH_PREFIXES = ["/sign-in", "/sign-up", "/forgot-password", "/sso-callback"];

/**
 * Resolve the role of a host from its subdomain.
 *  - app.*     → "app" (handles both auth and product surfaces)
 * Returns "" for the apex domain, localhost, and preview hosts so path-based
 * routing keeps working everywhere except the real subdomains.
 */
function hostRole(host: string): "app" | "" {
  const h = host.split(":")[0].toLowerCase();
  if (h.endsWith("localhost")) return "";
  const parts = h.split(".");
  if (parts.length < 3) return ""; // apex like floqex.com
  const sub = parts[0];
  if (sub === "app") return "app";
  return "";
}

function getRootDomain(host: string): string {
  const envRoot = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (envRoot) return envRoot;
  const h = host.split(":")[0].toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return "";
  const parts = h.split(".");
  if (parts.length >= 2) return parts.slice(-2).join(".");
  return "";
}

// Trusted origins for Clerk's authorized-parties (azp) check. Hardens against
// CSRF / cookie-leak from a compromised sibling subdomain.
function getAuthorizedParties(root: string) {
  if (!root) return undefined;
  return [
    `https://${root}`,
    `https://www.${root}`,
    `https://app.${root}`,
  ];
}

export default clerkMiddleware(
  async (auth, req) => {
    const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
    const url = req.nextUrl;
    const { pathname } = url;

    const role = hostRole(host);

    // ── app.floqex.com — the unified auth and product surface ──
    if (role === "app") {
      // API routes authenticate themselves (e.g. the Clerk webhook verifies a signature)
      if (pathname.startsWith("/api")) return NextResponse.next();

      const isAuthPath = AUTH_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );

      // Root of app.floqex.com -> route based on session
      if (pathname === "/") {
        const { userId } = await auth();
        const redirectUrl = url.clone();
        if (userId) {
          redirectUrl.pathname = "/dashboard";
        } else {
          redirectUrl.pathname = "/sign-in";
          redirectUrl.searchParams.set("redirect_url", url.href);
        }
        return NextResponse.redirect(redirectUrl);
      }

      // Auth pages
      if (isAuthPath) {
        const { userId } = await auth();
        if (userId) {
          const redirect = url.clone();
          redirect.pathname = "/dashboard";
          return NextResponse.redirect(redirect);
        }
        return NextResponse.next();
      }

      // App pages (protected)
      await auth.protect();

      // Clean product URLs: app.floqex.com/journal -> /dashboard/journal
      if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/onboarding")) {
        const rewritten = url.clone();
        rewritten.pathname = `/dashboard${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(rewritten);
      }
      return NextResponse.next();
    }

    // ── apex / localhost / previews — path-based routing ──
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
  }
);

export const config = {
  matcher: [
    "/v1/client/(.*)",
    "/npm/(.*)",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
