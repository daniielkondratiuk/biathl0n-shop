/*
  Warnings:

  - A unique constraint covering the columns `[productId,size]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProductBadge" AS ENUM ('NEW', 'BESTSELLER', 'SALE', 'LIMITED', 'BACKINSTOCK', 'TRENDING');

-- AlterEnum
ALTER TYPE "Gender" ADD VALUE 'UNISEX';

-- DropIndex
DROP INDEX "ProductVariant_gender_size_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "badge" "ProductBadge",
ADD COLUMN     "defaultPatchIds" TEXT[],
ADD COLUMN     "gallery" TEXT[],
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "mainImage" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "gender" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Product_gender_idx" ON "Product"("gender");

-- CreateIndex
CREATE INDEX "Product_badge_idx" ON "Product"("badge");

-- CreateIndex
CREATE INDEX "ProductVariant_size_idx" ON "ProductVariant"("size");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_size_key" ON "ProductVariant"("productId", "size");
