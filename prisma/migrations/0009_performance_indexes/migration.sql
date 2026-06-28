-- CreateIndex
CREATE INDEX IF NOT EXISTS "trades_accountId_status_closedAt_openedAt_idx" ON "public"."trades"("accountId", "status", "closedAt" DESC, "openedAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trades_botId_status_closedAt_openedAt_idx" ON "public"."trades"("botId", "status", "closedAt" DESC, "openedAt" DESC);
