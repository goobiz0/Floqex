-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Broker" AS ENUM ('PAPER', 'OANDA', 'IBKR', 'TRADOVATE', 'ALPACA');

-- CreateEnum
CREATE TYPE "AccountMode" AS ENUM ('PAPER', 'LIVE');

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('RUNNING', 'WAITING', 'STOPPED');

-- CreateEnum
CREATE TYPE "StrategyKind" AS ENUM ('ORB', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradeSession" AS ENUM ('ASIA', 'NY');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdjustmentSource" AS ENUM ('BOT', 'USER');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('APPLIED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "NewsImpact" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "broker" "Broker" NOT NULL DEFAULT 'PAPER',
    "mode" "AccountMode" NOT NULL DEFAULT 'PAPER',
    "externalId" TEXT,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 10000,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bots" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "status" "BotStatus" NOT NULL DEFAULT 'STOPPED',
    "autoAdjustmentsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeat" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "StrategyKind" NOT NULL DEFAULT 'ORB',
    "params" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "session" "TradeSession" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "entryPrice" DECIMAL(18,5) NOT NULL,
    "exitPrice" DECIMAL(18,5),
    "stopPrice" DECIMAL(18,5) NOT NULL,
    "targetPrice" DECIMAL(18,5) NOT NULL,
    "sizeUnits" DECIMAL(18,4) NOT NULL,
    "riskPct" DECIMAL(6,3) NOT NULL,
    "grossPnl" DECIMAL(18,2),
    "commission" DECIMAL(18,2),
    "netPnl" DECIMAL(18,2),
    "rMultiple" DECIMAL(8,3),
    "mfe" DECIMAL(8,3),
    "mae" DECIMAL(8,3),
    "rangeBucket" TEXT,
    "entryBucket" TEXT,
    "trendAgree" BOOLEAN,
    "screenshotUrl" TEXT,
    "narrative" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_adjustments" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "source" "AdjustmentSource" NOT NULL DEFAULT 'BOT',
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'APPLIED',
    "reasoning" TEXT,
    "sampleSize" INTEGER,
    "winRateDelta" DECIMAL(6,3),
    "confidence" DECIMAL(6,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "netPnl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "winCount" INTEGER NOT NULL DEFAULT 0,
    "lossCount" INTEGER NOT NULL DEFAULT 0,
    "startBalance" DECIMAL(18,2) NOT NULL,
    "endBalance" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_events" (
    "id" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "impact" "NewsImpact" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bots_accountId_key" ON "bots"("accountId");

-- CreateIndex
CREATE INDEX "bots_strategyId_idx" ON "bots"("strategyId");

-- CreateIndex
CREATE INDEX "strategies_userId_idx" ON "strategies"("userId");

-- CreateIndex
CREATE INDEX "trades_accountId_openedAt_idx" ON "trades"("accountId", "openedAt");

-- CreateIndex
CREATE INDEX "trades_botId_idx" ON "trades"("botId");

-- CreateIndex
CREATE INDEX "bot_adjustments_botId_createdAt_idx" ON "bot_adjustments"("botId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summaries_accountId_date_key" ON "daily_summaries"("accountId", "date");

-- CreateIndex
CREATE INDEX "news_events_eventTime_idx" ON "news_events"("eventTime");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_adjustments" ADD CONSTRAINT "bot_adjustments_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_adjustments" ADD CONSTRAINT "bot_adjustments_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

