-- CreateEnum
CREATE TYPE "CopySizingMode" AS ENUM ('MIRROR', 'MULTIPLIER', 'PROPORTIONAL', 'FIXED');

-- CreateEnum
CREATE TYPE "CopyLinkStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "copy_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "masterAccountId" TEXT NOT NULL,
    "followerAccountId" TEXT NOT NULL,
    "status" "CopyLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "sizingMode" "CopySizingMode" NOT NULL DEFAULT 'PROPORTIONAL',
    "multiplier" DECIMAL(8,4) NOT NULL DEFAULT 1,
    "fixedUnits" DECIMAL(18,4),
    "maxRiskPct" DECIMAL(6,3),
    "reverse" BOOLEAN NOT NULL DEFAULT false,
    "copyOpen" BOOLEAN NOT NULL DEFAULT true,
    "copyClose" BOOLEAN NOT NULL DEFAULT true,
    "copiedCount" INTEGER NOT NULL DEFAULT 0,
    "lastCopiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copy_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "copy_links_master_follower_check" CHECK ("masterAccountId" != "followerAccountId")
);

-- CreateTable
CREATE TABLE "copy_trade_events" (
    "id" TEXT NOT NULL,
    "copyLinkId" TEXT,
    "sourceTradeId" TEXT NOT NULL,
    "followerTradeId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "instrument" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "sizeUnits" DECIMAL(18,4),
    "pnl" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "copy_trade_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "copy_links_userId_idx" ON "copy_links"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_id_userId_key" ON "accounts"("id", "userId");

-- CreateIndex
CREATE INDEX "copy_links_masterAccountId_idx" ON "copy_links"("masterAccountId");

-- CreateIndex
CREATE INDEX "copy_links_followerAccountId_idx" ON "copy_links"("followerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "copy_links_masterAccountId_followerAccountId_key" ON "copy_links"("masterAccountId", "followerAccountId");

-- CreateIndex
CREATE INDEX "copy_trade_events_copyLinkId_createdAt_idx" ON "copy_trade_events"("copyLinkId", "createdAt");

-- CreateIndex
CREATE INDEX "copy_trade_events_sourceTradeId_idx" ON "copy_trade_events"("sourceTradeId");

-- AddForeignKey
ALTER TABLE "copy_links" ADD CONSTRAINT "copy_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copy_links" ADD CONSTRAINT "copy_links_masterAccountId_userId_fkey" FOREIGN KEY ("masterAccountId", "userId") REFERENCES "accounts"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copy_links" ADD CONSTRAINT "copy_links_followerAccountId_userId_fkey" FOREIGN KEY ("followerAccountId", "userId") REFERENCES "accounts"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copy_trade_events" ADD CONSTRAINT "copy_trade_events_copyLinkId_fkey" FOREIGN KEY ("copyLinkId") REFERENCES "copy_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
