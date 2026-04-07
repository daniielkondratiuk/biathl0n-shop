-- Migration: Cleanup old ProductVariant schema
-- This migration removes the old ProductVariant table and unused columns from Product

-- Step 1: Drop old ProductVariant table if it exists
-- Note: This will fail if there are foreign key constraints, so we handle them first
DO $$ 
BEGIN
  -- Drop foreign key constraints from CartItem, OrderItem, InventoryMovement
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProductVariant') THEN
    -- Drop foreign keys that reference ProductVariant
    ALTER TABLE IF EXISTS "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_variantId_fkey";
    ALTER TABLE IF EXISTS "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_variantId_fkey";
    ALTER TABLE IF EXISTS "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_variantId_fkey";
    
    -- Drop the ProductVariant table
    DROP TABLE IF EXISTS "ProductVariant" CASCADE;
  END IF;
END $$;

-- Step 2: Remove unused columns from Product table
-- These columns are no longer used in the new color variant architecture
ALTER TABLE IF EXISTS "Product" 
  DROP COLUMN IF EXISTS "mainImage",
  DROP COLUMN IF EXISTS "gallery";

-- Step 3: Drop old ProductImage table if it references Product directly
-- The new ProductImage references ProductColorVariant instead
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ProductImage' AND column_name = 'productId'
  ) THEN
    -- Drop old ProductImage table (new one references ProductColorVariant)
    DROP TABLE IF EXISTS "ProductImage" CASCADE;
  END IF;
END $$;

-- Step 4: Clean up any old indexes
DROP INDEX IF EXISTS "Product_variants_idx";
DROP INDEX IF EXISTS "ProductImage_productId_idx";

-- Note: The new schema uses:
-- - ProductColorVariant (replaces ProductVariant)
-- - ProductSizeVariant (nested under ProductColorVariant)
-- - ProductImage (references ProductColorVariant with role enum)

