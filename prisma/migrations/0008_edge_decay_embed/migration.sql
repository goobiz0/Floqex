-- Edge-decay protection and public proof-of-execution embed.
-- Adds the bot-level flags the edge-decay engine and embed page rely on.

ALTER TABLE "bots" ADD COLUMN "edgeDecayPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bots" ADD COLUMN "edgeDecayThreshold" DECIMAL(5,2);
ALTER TABLE "bots" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
