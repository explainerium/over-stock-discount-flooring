-- A dealer's price for a whole series (client, 19 November 2026: "we set
-- pricing by the series"). New table only; nothing existing changes.

-- CreateTable
CREATE TABLE "DealerSeriesPrice" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DealerSeriesPrice_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "DealerSeriesPrice_seriesId_idx" ON "DealerSeriesPrice"("seriesId");
-- CreateIndex
CREATE UNIQUE INDEX "DealerSeriesPrice_dealerId_seriesId_key" ON "DealerSeriesPrice"("dealerId", "seriesId");
-- AddForeignKey
ALTER TABLE "DealerSeriesPrice" ADD CONSTRAINT "DealerSeriesPrice_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DealerSeriesPrice" ADD CONSTRAINT "DealerSeriesPrice_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
