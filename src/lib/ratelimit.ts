import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Shared rate-limit helper. Upstash is already used directly in the MCP route
// (`src/app/api/v1/mcp/route.ts`); this centralises the setup so other routes
// (webhooks, etc.) limit consistently and degrade gracefully when Upstash is
// not configured (local dev / self-host) instead of throwing at import time.

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasUpstash ? Redis.fromEnv() : null;

// Cache one Ratelimit instance per window so the sliding-window analytics stay
// coherent across requests within the same server instance.
const limiters = new Map<string, Ratelimit>();

type Window = `${number} ${"s" | "m" | "h"}`;

function getLimiter(limit: number, window: Window) {
  const cacheKey = `${limit}:${window}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter && redis) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: "fqx_rl",
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Returns `true` when the request is allowed, `false` when the caller has
 * exceeded the limit. When Upstash is not configured this is a no-op that
 * always allows, so the feature never hard-fails an environment that lacks it.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  window: Window
): Promise<boolean> {
  const limiter = getLimiter(limit, window);
  if (!limiter) return true;
  const { success } = await limiter.limit(identifier);
  return success;
}

/** Best-effort client IP from common proxy headers, falling back to a constant. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
