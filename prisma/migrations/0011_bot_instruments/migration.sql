-- Assets a bot trades now live on the bot, not the strategy, so one strategy can
-- drive several bots on different instruments. Existing rows default to an empty
-- list; the engine falls back to the strategy's params for those (instrumentsForBot).
ALTER TABLE "public"."bots" ADD COLUMN "instruments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
