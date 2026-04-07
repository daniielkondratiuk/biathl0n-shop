-- AlterTable
ALTER TABLE "CartItem" ALTER COLUMN "selectedPatchIds" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "selectedPatchIds" DROP DEFAULT;
