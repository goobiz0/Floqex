import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next.js 16 renames `middleware` to `proxy` (Node runtime). Clerk runs here.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

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

export default clerkMiddleware(async (auth, req) => {
  const sub = productSubdomain(req.headers.get("host") ?? "");
  const { pathname } = req.nextUrl;

  // Map the root of each product subdomain to its section. Internal navigation
  // stays path-based, so this is a no-op on localhost and preview deploys.
  if (sub === "dashboard" && pathname === "/") {
    await auth.protect();
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.rewrite(url);
  }
  if (sub === "accounts" && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.rewrite(url);
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
