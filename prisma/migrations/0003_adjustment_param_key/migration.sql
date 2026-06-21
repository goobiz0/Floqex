-- AlterTable
-- Canonical schema key for a parameter change, so an approved suggestion can be
-- applied to Strategy.params server-side. Nullable for backward compatibility
-- with any pre-existing rows.
ALTER TABLE "bot_adjustments" ADD COLUMN "paramKey" TEXT;
