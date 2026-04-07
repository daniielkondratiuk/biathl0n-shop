-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "pdfData" BYTEA,
ADD COLUMN     "pdfGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "pdfMimeType" TEXT NOT NULL DEFAULT 'application/pdf';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'EUR';
