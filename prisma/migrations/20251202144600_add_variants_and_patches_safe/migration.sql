/*
  Safe migration for adding variants and patches support
  - Adds new columns with DEFAULT values
  - Updates existing rows to populate new fields
  - Handles existing data gracefully
*/

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MEN', 'WOMEN', 'KIDS');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- DropForeignKey (temporary, will be re-added)
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_cartId_fkey";
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_productId_fkey";
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_variantId_fkey";

ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_orderId_fkey";
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_productId_fkey";
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_variantId_fkey";

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_orderId_fkey";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_variantId_fkey";

ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_productId_fkey";

-- Step 1: Add new columns to Product with defaults
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "basePrice" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';

-- Step 2: Update existing Product rows to populate new fields from existing data
UPDATE "Product" SET 
  "title" = COALESCE("name", ''),
  "basePrice" = COALESCE("price", 0),
  "isActive" = COALESCE("visible", true)
WHERE "title" = '' OR "basePrice" = 0;

-- Step 3: Add new columns to CartItem with defaults
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "finalPrice" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "selectedPatchIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 4: Update existing CartItem rows to calculate finalPrice
UPDATE "CartItem" SET 
  "finalPrice" = "unitPrice" * "quantity"
WHERE "finalPrice" = 0;

-- Step 5: Add new columns to OrderItem with defaults
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "finalPrice" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "selectedPatchIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 6: Update existing OrderItem rows to populate finalPrice from totalPrice
UPDATE "OrderItem" SET 
  "finalPrice" = COALESCE("totalPrice", "unitPrice" * "quantity")
WHERE "finalPrice" = 0;

-- Step 7: Add new columns to ProductVariant (make them optional first)
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "gender" "Gender";
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "size" "Size";
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "priceDiff" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Step 8: Update existing ProductVariant rows with default values
-- Set default gender and size for existing variants
UPDATE "ProductVariant" SET 
  "gender" = 'MEN'::"Gender"
WHERE "gender" IS NULL;

UPDATE "ProductVariant" SET 
  "size" = 'M'::"Size"
WHERE "size" IS NULL;

-- Step 9: Generate SKUs for existing variants that don't have one
-- Use a subquery to ensure we get unique SKUs even if multiple variants exist
UPDATE "ProductVariant" pv
SET "sku" = COALESCE(
  NULLIF(pv."sku", ''),
  UPPER(
    CONCAT(
      (SELECT "slug" FROM "Product" WHERE "id" = pv."productId"),
      '-',
      COALESCE(pv."gender"::TEXT, 'MEN'),
      '-',
      COALESCE(pv."size"::TEXT, 'M'),
      '-',
      SUBSTRING(pv."id", 1, 8) -- Add unique suffix from ID to ensure uniqueness
    )
  )
)
WHERE pv."sku" IS NULL OR pv."sku" = '';

-- Step 10: Set default stock for existing variants
UPDATE "ProductVariant" SET 
  "stock" = COALESCE("stock", 0)
WHERE "stock" IS NULL;

-- Step 11: Now make gender and size required (they all have values now)
ALTER TABLE "ProductVariant" ALTER COLUMN "gender" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "size" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "sku" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "stock" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "stock" SET DEFAULT 0;

-- Step 12: Make name and value optional (they're deprecated)
ALTER TABLE "ProductVariant" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "value" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Patch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductPatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "patchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Patch_slug_key" ON "Patch"("slug");
CREATE INDEX IF NOT EXISTS "Patch_isActive_idx" ON "Patch"("isActive");
CREATE INDEX IF NOT EXISTS "Patch_slug_idx" ON "Patch"("slug");

CREATE INDEX IF NOT EXISTS "ProductPatch_productId_idx" ON "ProductPatch"("productId");
CREATE INDEX IF NOT EXISTS "ProductPatch_patchId_idx" ON "ProductPatch"("patchId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductPatch_productId_patchId_key" ON "ProductPatch"("productId", "patchId");

CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX IF NOT EXISTS "ProductVariant_gender_size_idx" ON "ProductVariant"("gender", "size");
CREATE INDEX IF NOT EXISTS "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductPatch" ADD CONSTRAINT "ProductPatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPatch" ADD CONSTRAINT "ProductPatch_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "Patch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
