-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Address_userId_isPrimary_idx" ON "Address"("userId", "isPrimary");
