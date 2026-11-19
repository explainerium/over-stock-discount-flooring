-- "Inquire About Pricing" on every product page (client revision list,
-- 19 November 2026): who is asking and where they are. Additive only.

-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE 'PRICE_INQUIRY';

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('HOMEOWNER', 'CONTRACTOR', 'DEALER');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "customerType" "CustomerType",
ADD COLUMN "zip" TEXT;
