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

function getRoot(): string {
  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) return process.env.NEXT_PUBLIC_ROOT_DOMAIN.trim();
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return "";
    const parts = h.split(".");
    if (parts.length >= 2) return parts.slice(-2).join(".");
  }
  return "";
}

function useSubdomains(root: string): boolean {
  return root.length > 0;
}

function withLeadingSlash(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function marketingUrl(path = "/"): string {
  const p = withLeadingSlash(path);
  const r = getRoot();
  return useSubdomains(r) ? `https://${r}${p === "/" ? "/" : p}` : p;
}

export function authUrl(path = "/sign-in"): string {
  const p = withLeadingSlash(path);
  const r = getRoot();
  return useSubdomains(r) ? `https://users.${r}${p}` : p;
}

/**
 * Product surface (the account dashboard): dashboard.floqex.com
 * Pass clean product paths ("/", "/journal"). In dev these are namespaced under
 * /dashboard to match the internal route tree.
 */
export function dashboardUrl(path = "/"): string {
  const p = withLeadingSlash(path);
  const r = getRoot();
  if (useSubdomains(r)) {
    return `https://dashboard.${r}${p === "/" ? "/" : p}`;
  }
  if (p === "/") return "/dashboard";
  return p.startsWith("/dashboard") ? p : `/dashboard${p}`;
}

export function onboardingUrl(): string {
  const r = getRoot();
  return useSubdomains(r) ? `https://dashboard.${r}/onboarding` : "/onboarding";
}
