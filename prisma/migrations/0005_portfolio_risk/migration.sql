-- Portfolio Risk Command Center: portfolio-level controls.
-- Additive and nullable (or defaulted) so the migration is safe on live data.

-- AlterTable: User gains a portfolio drawdown limit and a global kill switch.
ALTER TABLE "users" ADD COLUMN "maxPortfolioDrawdown" DECIMAL(18,2);
ALTER TABLE "users" ADD COLUMN "tradingHalted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Bot gains an optional risk-budget weight.
ALTER TABLE "bots" ADD COLUMN "riskWeight" DECIMAL(5,2);
