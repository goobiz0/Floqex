-- Copy-trading link controls: symbol filters, size bounds, a real per-trade
-- risk cap, and a daily-loss circuit breaker that auto-pauses a link.
ALTER TABLE "public"."copy_links" ADD COLUMN "minUnits" DECIMAL(18,4);
ALTER TABLE "public"."copy_links" ADD COLUMN "maxUnits" DECIMAL(18,4);
ALTER TABLE "public"."copy_links" ADD COLUMN "symbolFilter" TEXT;
ALTER TABLE "public"."copy_links" ADD COLUMN "symbolFilterMode" TEXT NOT NULL DEFAULT 'ALLOW';
ALTER TABLE "public"."copy_links" ADD COLUMN "maxDailyLossPct" DECIMAL(6,3);
ALTER TABLE "public"."copy_links" ADD COLUMN "pausedReason" TEXT;
