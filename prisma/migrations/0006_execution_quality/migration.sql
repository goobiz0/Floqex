-- Execution Quality & Bot Observability: capture intended vs actual fills.
-- Additive and nullable so the migration is safe on existing trades.

ALTER TABLE "trades" ADD COLUMN "intendedEntryPrice" DECIMAL(18,5);
ALTER TABLE "trades" ADD COLUMN "entrySlippageBps" DECIMAL(10,3);
ALTER TABLE "trades" ADD COLUMN "intendedExitPrice" DECIMAL(18,5);
ALTER TABLE "trades" ADD COLUMN "exitSlippageBps" DECIMAL(10,3);
ALTER TABLE "trades" ADD COLUMN "entryLatencyMs" INTEGER;
