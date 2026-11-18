-- Categories: what shelf a product sits on. Every product gets one; series
-- becomes optional because only flooring has a spec group.

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "blurb" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- The two shelves the existing catalogue already has. Anything with square
-- feet per box is flooring; the rest (baseboard, quarter round) is an
-- accessory. The owner renames or splits these in admin.
INSERT INTO "Category" ("id", "name", "slug", "sortOrder", "updatedAt") VALUES
    ('cat_flooring', 'Flooring', 'flooring', 0, CURRENT_TIMESTAMP),
    ('cat_accessories', 'Accessories', 'accessories', 100, CURRENT_TIMESTAMP);

-- AlterTable: added nullable, filled, then made required, so existing rows
-- never violate the constraint.
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

UPDATE "Product" AS p
SET "categoryId" = CASE WHEN s."sqFtPerBox" IS NOT NULL THEN 'cat_flooring' ELSE 'cat_accessories' END
FROM "Series" AS s
WHERE p."seriesId" = s."id";

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "seriesId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
