/*
  Warnings:

  - You are about to drop the column `colorId` on the `WishlistItem` table. All the data in the column will be lost.
  - You are about to drop the column `sizeId` on the `WishlistItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,productId,colorVariantId,sizeVariantId]` on the table `WishlistItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "WishlistItem_userId_productId_colorId_sizeId_key";

-- AlterTable
ALTER TABLE "WishlistItem" DROP COLUMN "colorId",
DROP COLUMN "sizeId",
ADD COLUMN     "colorVariantId" TEXT,
ADD COLUMN     "sizeVariantId" TEXT;

-- CreateIndex
CREATE INDEX "WishlistItem_colorVariantId_idx" ON "WishlistItem"("colorVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_colorVariantId_sizeVariantId_key" ON "WishlistItem"("userId", "productId", "colorVariantId", "sizeVariantId");
