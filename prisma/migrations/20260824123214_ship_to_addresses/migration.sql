-- DropIndex
DROP INDEX "Address_dealerId_idx";

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shipToSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "Address_dealerId_isActive_idx" ON "Address"("dealerId", "isActive");
