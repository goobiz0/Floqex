-- CreateTable
CREATE TABLE "mochi_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mochi_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mochi_usage_userId_ts_idx" ON "mochi_usage"("userId", "ts");

-- AddForeignKey
ALTER TABLE "mochi_usage" ADD CONSTRAINT "mochi_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
