-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_orderId_status_idx" ON "Payment"("orderId", "status");
