/**
 * Sentinel accountId meaning "aggregate across every account the user owns".
 * Used as the `?account=` URL value for the All Accounts view. Kept in its own
 * client-safe module (no Prisma/Clerk server imports) so both server queries
 * and client components (sidebar, topbar switcher) can share one source of truth.
 */
export const ALL_ACCOUNTS_ID = "all";
