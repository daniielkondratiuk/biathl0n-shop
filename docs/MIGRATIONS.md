# Migration Guide

## Safe Migration Strategy

This guide covers safe migration practices for adding new required fields to existing tables without losing data.

## Migration Pattern

The safe migration pattern follows these steps:

1. **Add columns with DEFAULT values** - Prevents errors on existing rows
2. **Update existing rows** - Populates new fields from existing data
3. **Make fields required** - After all rows have values

## Example: Variants and Patches Migration

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

4. **ProductVariant** (legacy, now replaced by Color/Size variants)
   - `gender` (Gender enum, required)
   - `size` (Size enum, required)
   - `priceDiff` (Int, required, default: 0)
   - `stock` (Int, required, default: 0)
   - `sku` (String, required, unique)

### Data Transformations

- **Product.title**: Copied from `name` field
- **Product.basePrice**: Copied from `price` field
- **CartItem.finalPrice**: Calculated as `unitPrice * quantity`
- **OrderItem.finalPrice**: Copied from `totalPrice`
- **ProductVariant.sku**: Auto-generated as `{productSlug}-{gender}-{size}` (uppercase)
- **ProductVariant.gender/size**: Set to defaults for existing variants

## Running Migrations

### Development
```bash
# Review the migration SQL first
cat prisma/migrations/[migration-name]/migration.sql

# Apply the migration
npx prisma migrate dev
```

### Production
```bash
npx prisma migrate deploy
```

## Verification

After migration, verify data integrity:

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

-- Check that all ProductVariants have required fields
SELECT COUNT(*) FROM "ProductVariant" WHERE "gender" IS NULL OR "size" IS NULL OR "sku" IS NULL OR "sku" = '';
-- Should return 0
```

## Rollback Considerations

**Note**: Most migrations are designed to be one-way. If you need to rollback:

1. **Data Loss Risk**: Removing columns will lose data
2. **Alternative**: Create a new migration that makes fields optional again
3. **Best Practice**: Always backup database before migrations

## Post-Migration

After migration, all fields are required in the Prisma schema but have defaults, ensuring:
- New records get sensible defaults
- Existing records were properly migrated
- No data loss occurred

## Migration Integrity & Workflow Rules

### Commit Requirements

Always commit these files together:
- `prisma/schema.prisma`
- `prisma/migrations/*` (all migration directories)
- `prisma/migrations/migration_lock.toml`

**Never** commit schema changes without their corresponding migrations, or migrations without schema changes.

### Development Workflow

**Before running `prisma migrate dev`:**
- Ensure your branch is clean (no uncommitted changes)
- Ensure your branch is pushed to remote
- Verify no other team member has pending migrations

**Command usage:**
- `prisma migrate dev` - Development only. Creates and applies migrations. Use when schema changes are needed.
- `prisma migrate deploy` - Production only. Applies pending migrations without creating new ones.
- `prisma db push` - Never use in production. Only for prototyping or when migrations are not needed.

### Schema Drift Prevention

**Never manually change database schema** without creating a corresponding Prisma migration. All schema changes must:
1. Be defined in `prisma/schema.prisma`
2. Generate a migration via `prisma migrate dev`
3. Be committed to version control

### Handling Missing Migrations

If Prisma reports missing migrations:

**Do NOT:**
- ❌ Run `prisma migrate reset` on any database with real data
- ❌ Create empty or fake migrations
- ❌ Manually edit migration files to match current schema

**Do:**
1. **Restore missing migration** - If migration exists in git history:
   - Checkout the missing migration from the correct commit
   - Verify it matches the expected schema state
   - Commit the restored migration

2. **Baseline if restoration impossible** - If migration cannot be restored:
   - Use `prisma migrate resolve --applied <migration-name>` to mark as applied
   - Only after verifying the database schema matches the migration state
   - Document the baseline in commit message

### Handling Schema Drift

If Prisma detects schema drift:

1. **Identify the source** - Check if drift is from:
   - Manual database changes (forbidden)
   - Missing migrations (restore or baseline)
   - Uncommitted local changes (commit first)

2. **Resolve drift**:
   - If drift is expected: create migration to align schema
   - If drift is unexpected: investigate and restore correct state
   - Never ignore drift warnings

### Team Collaboration Rules

**Multi-machine / Multi-developer:**
- Always pull latest migrations before running `prisma migrate dev`
- Never run migrations on a database others are using
- Coordinate schema changes through pull requests
- Review migration SQL in PRs before merging

**Database state:**
- Each environment (dev/staging/prod) tracks its own migration state
- Never share migration state between environments
- Production migrations must be reviewed and tested in staging first

### Recovery Strategy

When migration integrity is compromised:

1. **Assess the situation**:
   - Check `_prisma_migrations` table for applied migrations
   - Compare with `prisma/migrations/` directory
   - Identify missing or extra migrations

2. **Restore missing migrations** (preferred):
   - Find migration in git history
   - Restore entire migration directory
   - Verify SQL matches current database state
   - Mark as applied if already in database: `prisma migrate resolve --applied <name>`

3. **Baseline** (last resort):
   - Only if restoration is impossible
   - Use `prisma migrate resolve` to mark migrations as applied
   - Document why baseline was necessary
   - Ensure database schema matches Prisma schema exactly

4. **Prevent recurrence**:
   - Review commit workflow
   - Ensure all migrations are committed before sharing
   - Add pre-commit hooks if needed
