# Safe Migration Guide - Variants and Patches

## Migration Strategy

This migration safely adds new required fields to existing tables without losing data.

### Fields Added

1. **Product**
   - `title` (String, required, default: "")
   - `basePrice` (Int, required, default: 0)
   - `isActive` (Boolean, required, default: true)

2. **CartItem**
   - `finalPrice` (Int, required, default: 0)
   - `selectedPatchIds` (String[], default: [])

3. **OrderItem**
   - `finalPrice` (Int, required, default: 0)
   - `selectedPatchIds` (String[], default: [])

4. **ProductVariant**
   - `gender` (Gender enum, required)
   - `size` (Size enum, required)
   - `priceDiff` (Int, required, default: 0)
   - `stock` (Int, required, default: 0)
   - `sku` (String, required, unique)
   - `image` (String, optional)

### Migration Steps

The migration SQL follows this safe pattern:

1. **Add columns with DEFAULT values** - Prevents errors on existing rows
2. **Update existing rows** - Populates new fields from existing data:
   - `Product.title` ← `Product.name`
   - `Product.basePrice` ← `Product.price`
   - `CartItem.finalPrice` ← `unitPrice * quantity`
   - `OrderItem.finalPrice` ← `totalPrice`
   - `ProductVariant.gender` ← 'MEN' (default)
   - `ProductVariant.size` ← 'M' (default)
   - `ProductVariant.sku` ← Generated from product slug + gender + size
3. **Make fields required** - After all rows have values

### Data Transformations

- **Product.title**: Copied from `name` field
- **Product.basePrice**: Copied from `price` field
- **CartItem.finalPrice**: Calculated as `unitPrice * quantity`
- **OrderItem.finalPrice**: Copied from `totalPrice`
- **ProductVariant.sku**: Auto-generated as `{productSlug}-{gender}-{size}` (uppercase)
- **ProductVariant.gender/size**: Set to 'MEN' and 'M' as defaults for existing variants

## Running the Migration

```bash
# Review the migration SQL first
cat prisma/migrations/20251202144600_add_variants_and_patches_safe/migration.sql

# Apply the migration
npx prisma migrate dev

# Or in production
npx prisma migrate deploy
```

## Post-Migration

After migration, all fields are required in the Prisma schema but have defaults, ensuring:
- New records get sensible defaults
- Existing records were properly migrated
- No data loss occurred

## Verification

After migration, verify:

```sql
-- Check that all Products have title and basePrice
SELECT COUNT(*) FROM "Product" WHERE "title" = '' OR "basePrice" = 0;
-- Should return 0 (or only new products you haven't updated yet)

-- Check that all CartItems have finalPrice
SELECT COUNT(*) FROM "CartItem" WHERE "finalPrice" = 0 AND "quantity" > 0 AND "unitPrice" > 0;
-- Should return 0

-- Check that all OrderItems have finalPrice
SELECT COUNT(*) FROM "OrderItem" WHERE "finalPrice" = 0 AND "totalPrice" > 0;
-- Should return 0

-- Check that all ProductVariants have gender, size, and sku
SELECT COUNT(*) FROM "ProductVariant" WHERE "gender" IS NULL OR "size" IS NULL OR "sku" IS NULL OR "sku" = '';
-- Should return 0
```

## Rollback

If you need to rollback, you would need to:
1. Remove the new columns (but this would lose data)
2. Or create a new migration that makes fields optional again

**Note**: This migration is designed to be one-way. If you need to rollback, consider the data implications first.

