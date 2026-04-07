/*
  Warnings:

  - You are about to drop the column `backgroundColorDark` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `backgroundColorLight` on the `Product` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "InventoryMovementType" ADD VALUE 'RESERVED';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "backgroundColorDark",
DROP COLUMN "backgroundColorLight";

-- AlterTable
ALTER TABLE "ProductSizeVariant" ADD COLUMN     "stockReserved" INTEGER NOT NULL DEFAULT 0;
