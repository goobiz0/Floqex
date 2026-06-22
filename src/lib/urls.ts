/**
 * Cross-subdomain URL helpers.
 *
 * In production (NEXT_PUBLIC_ROOT_DOMAIN set, e.g. "floqex.com") these return
 * absolute URLs to the right subdomain so links never resolve to the wrong host:
 *   marketingUrl()      -> https://floqex.com/
 *   authUrl("/sign-up") -> https://users.floqex.com/sign-up
 *   dashboardUrl("/journal") -> https://accounts.floqex.com/journal
 *
 * In local dev / preview (no root domain) they fall back to path-based routing
 * so a single host serves everything:
 *   authUrl("/sign-up")      -> /sign-up
 *   dashboardUrl("/journal") -> /dashboard/journal
 */

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "";
const useSubdomains = ROOT.length > 0;

function withLeadingSlash(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Marketing site (apex): floqex.com */
export function marketingUrl(path = "/"): string {
  const p = withLeadingSlash(path);
  return useSubdomains ? `https://${ROOT}${p === "/" ? "/" : p}` : p;
}

/** Auth surface: users.floqex.com */
export function authUrl(path = "/sign-in"): string {
  const p = withLeadingSlash(path);
  return useSubdomains ? `https://users.${ROOT}${p}` : p;
}

/**
 * Product surface (the account dashboard): accounts.floqex.com
 * Pass clean product paths ("/", "/journal"). In dev these are namespaced under
 * /dashboard to match the internal route tree.
 */
export function dashboardUrl(path = "/"): string {
  const p = withLeadingSlash(path);
  if (useSubdomains) {
    return `https://accounts.${ROOT}${p === "/" ? "/" : p}`;
  }
  if (p === "/") return "/dashboard";
  return p.startsWith("/dashboard") ? p : `/dashboard${p}`;
}

/** First-run onboarding (lives at /onboarding, served on the product host). */
export function onboardingUrl(): string {
  return useSubdomains ? `https://accounts.${ROOT}/onboarding` : "/onboarding";
}
