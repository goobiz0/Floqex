import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next.js 16 renames `middleware` to `proxy` (Node runtime). Clerk runs here.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

// Auth routes that live natively on accounts.floqex.com.
const AUTH_PREFIXES = ["/sign-in", "/sign-up", "/forgot-password", "/sso-callback"];

/**
 * Resolve the product subdomain (`dashboard` / `accounts`) from the host.
 * Returns "" for the apex domain, localhost, and preview hosts so that
 * path-based routing keeps working everywhere except the real subdomains.
 */
function productSubdomain(host: string): "dashboard" | "accounts" | "" {
  const h = host.split(":")[0].toLowerCase();
  if (h.endsWith("localhost")) return "";
  const parts = h.split(".");
  if (parts.length < 3) return ""; // apex like floqex.com
  if (parts[0] === "dashboard") return "dashboard";
  if (parts[0] === "accounts") return "accounts";
  return "";
}

// Trusted origins for Clerk's authorized-parties (azp) check. Hardens against
// CSRF / cookie-leak from a compromised sibling subdomain. Only set in prod
// where the root domain is known; pair with "Allowed Subdomains" in Clerk.
const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
const authorizedParties = root
  ? [`https://${root}`, `https://accounts.${root}`, `https://dashboard.${root}`]
  : undefined;

export default clerkMiddleware(
  async (auth, req) => {
    const sub = productSubdomain(req.headers.get("host") ?? "");
    const url = req.nextUrl;
    const { pathname } = url;

    // ── dashboard.floqex.com — the product, fully protected ──
    if (sub === "dashboard") {
      // API routes authenticate themselves (e.g. the Clerk webhook verifies a
      // signature), so never gate them behind a session here.
      if (pathname.startsWith("/api")) return NextResponse.next();

      await auth.protect();

      // Clean product URLs: dashboard.floqex.com/journal -> /dashboard/journal.
      // Leave the already-namespaced product tree and onboarding untouched.
      if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/onboarding")) {
        const rewritten = url.clone();
        rewritten.pathname = `/dashboard${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(rewritten);
      }
      return NextResponse.next();
    }

    // ── accounts.floqex.com — auth only ──
    if (sub === "accounts") {
      if (pathname === "/") {
        const rewritten = url.clone();
        rewritten.pathname = "/sign-in";
        return NextResponse.rewrite(rewritten);
      }
      const isAuthPath = AUTH_PREFIXES.some((p) => pathname.startsWith(p));
      if (!isAuthPath && !pathname.startsWith("/api")) {
        const redirect = url.clone();
        redirect.pathname = "/sign-in";
        return NextResponse.redirect(redirect);
      }
      return NextResponse.next();
    }

    // ── apex / localhost / previews — path-based routing ──
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
    return NextResponse.next();
  },
  authorizedParties ? { authorizedParties } : undefined,
);

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
