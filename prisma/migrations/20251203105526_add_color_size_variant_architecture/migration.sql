/*
  Warnings:

  - You are about to drop the column `variantId` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `InventoryMovement` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `gallery` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `mainImage` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `alt` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `isPrimary` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `largeUrl` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `mediumUrl` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `thumbUrl` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the `ProductVariant` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `colorVariantId` to the `ProductImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `ProductImage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ImageRole" AS ENUM ('MAIN', 'MAIN_DETAIL', 'GALLERY');

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_variantId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_variantId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- DropIndex
DROP INDEX "CartItem_variantId_idx";

-- DropIndex
DROP INDEX "InventoryMovement_variantId_idx";

-- DropIndex
DROP INDEX "OrderItem_variantId_idx";

-- DropIndex
DROP INDEX "ProductImage_productId_idx";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "variantId",
ADD COLUMN     "sizeVariantId" TEXT;

-- AlterTable
ALTER TABLE "InventoryMovement" DROP COLUMN "variantId",
ADD COLUMN     "sizeVariantId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "variantId",
ADD COLUMN     "sizeVariantId" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "gallery",
DROP COLUMN "mainImage";

-- AlterTable
ALTER TABLE "ProductImage" DROP COLUMN "alt",
DROP COLUMN "height",
DROP COLUMN "isPrimary",
DROP COLUMN "largeUrl",
DROP COLUMN "mediumUrl",
DROP COLUMN "productId",
DROP COLUMN "publicId",
DROP COLUMN "sortOrder",
DROP COLUMN "thumbUrl",
DROP COLUMN "width",
ADD COLUMN     "colorVariantId" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "role" "ImageRole" NOT NULL;

-- DropTable
DROP TABLE "ProductVariant";

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductColorVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "priceDiff" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductColorVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSizeVariant" (
    "id" TEXT NOT NULL,
    "colorVariantId" TEXT NOT NULL,
    "size" "Size" NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "priceDiff" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSizeVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_slug_key" ON "Color"("slug");

-- CreateIndex
CREATE INDEX "Color_slug_idx" ON "Color"("slug");

-- CreateIndex
CREATE INDEX "ProductColorVariant_productId_idx" ON "ProductColorVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductColorVariant_colorId_idx" ON "ProductColorVariant"("colorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductColorVariant_productId_colorId_key" ON "ProductColorVariant"("productId", "colorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSizeVariant_sku_key" ON "ProductSizeVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductSizeVariant_colorVariantId_idx" ON "ProductSizeVariant"("colorVariantId");

-- CreateIndex
CREATE INDEX "ProductSizeVariant_size_idx" ON "ProductSizeVariant"("size");

-- CreateIndex
CREATE INDEX "ProductSizeVariant_sku_idx" ON "ProductSizeVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSizeVariant_colorVariantId_size_key" ON "ProductSizeVariant"("colorVariantId", "size");

-- CreateIndex
CREATE INDEX "CartItem_sizeVariantId_idx" ON "CartItem"("sizeVariantId");

-- CreateIndex
CREATE INDEX "InventoryMovement_sizeVariantId_idx" ON "InventoryMovement"("sizeVariantId");

-- CreateIndex
CREATE INDEX "OrderItem_sizeVariantId_idx" ON "OrderItem"("sizeVariantId");

-- CreateIndex
CREATE INDEX "ProductImage_colorVariantId_idx" ON "ProductImage"("colorVariantId");

-- CreateIndex
CREATE INDEX "ProductImage_colorVariantId_role_idx" ON "ProductImage"("colorVariantId", "role");

-- AddForeignKey
ALTER TABLE "ProductColorVariant" ADD CONSTRAINT "ProductColorVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductColorVariant" ADD CONSTRAINT "ProductColorVariant_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizeVariant" ADD CONSTRAINT "ProductSizeVariant_colorVariantId_fkey" FOREIGN KEY ("colorVariantId") REFERENCES "ProductColorVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_colorVariantId_fkey" FOREIGN KEY ("colorVariantId") REFERENCES "ProductColorVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_sizeVariantId_fkey" FOREIGN KEY ("sizeVariantId") REFERENCES "ProductSizeVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sizeVariantId_fkey" FOREIGN KEY ("sizeVariantId") REFERENCES "ProductSizeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_sizeVariantId_fkey" FOREIGN KEY ("sizeVariantId") REFERENCES "ProductSizeVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
