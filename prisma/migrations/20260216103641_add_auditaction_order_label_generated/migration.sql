DO $$
BEGIN
  -- Add missing enum variant (idempotent)
  ALTER TYPE "AuditAction" ADD VALUE 'ORDER_LABEL_GENERATED';
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
