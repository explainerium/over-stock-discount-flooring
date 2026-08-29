-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dealerRestricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DealerProductAccess" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerProductAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerProductAccess_productId_idx" ON "DealerProductAccess"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerProductAccess_dealerId_productId_key" ON "DealerProductAccess"("dealerId", "productId");

-- CreateIndex
CREATE INDEX "Product_dealerRestricted_idx" ON "Product"("dealerRestricted");

-- AddForeignKey
ALTER TABLE "DealerProductAccess" ADD CONSTRAINT "DealerProductAccess_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerProductAccess" ADD CONSTRAINT "DealerProductAccess_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
