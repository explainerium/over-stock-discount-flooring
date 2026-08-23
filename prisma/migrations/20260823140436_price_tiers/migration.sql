/*
  Warnings:

  - You are about to drop the column `priceTier` on the `Dealer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Dealer" DROP COLUMN "priceTier",
ADD COLUMN     "priceTierId" TEXT;

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceTier_name_key" ON "PriceTier"("name");

-- AddForeignKey
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "PriceTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
