-- AlterEnum
-- The `UNIQUE` value exists in schema.prisma and is used across the product
-- size selectors/filters, but no migration ever added it to the Postgres enum.
-- This backfills it so the DB matches the schema (fixes schema drift).
ALTER TYPE "Size" ADD VALUE 'UNIQUE';
