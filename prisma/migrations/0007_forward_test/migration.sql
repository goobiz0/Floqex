-- Forward-Test Promotion Gate: prove a strategy in live paper trading before
-- live capital is unlocked.

-- CreateEnum
CREATE TYPE "ForwardTestStatus" AS ENUM ('RUNNING', 'PASSED', 'FAILED', 'STOPPED');

-- CreateTable
CREATE TABLE "forward_tests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "ForwardTestStatus" NOT NULL DEFAULT 'RUNNING',
    "targetTrades" INTEGER NOT NULL DEFAULT 20,
    "baselineWinRate" DECIMAL(6,3),
    "baselineExpectancy" DECIMAL(8,3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forward_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forward_tests_userId_idx" ON "forward_tests"("userId");
CREATE INDEX "forward_tests_accountId_idx" ON "forward_tests"("accountId");

-- AddForeignKey
ALTER TABLE "forward_tests" ADD CONSTRAINT "forward_tests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forward_tests" ADD CONSTRAINT "forward_tests_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forward_tests" ADD CONSTRAINT "forward_tests_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
