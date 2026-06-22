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

    // Let the hosting provider handle www vs apex canonicalization.
    // Explicit redirects here can cause infinite loops if the host is configured
    // to prefer www over apex.

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
  authorizedParties ? { authorizedParties } : undefined,
);

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
