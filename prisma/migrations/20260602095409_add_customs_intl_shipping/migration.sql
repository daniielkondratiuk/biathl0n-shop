-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "customsDefaultHsCode" TEXT,
ADD COLUMN     "customsDefaultOriginCountry" TEXT,
ADD COLUMN     "eori" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cn23Path" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "customsDescriptionEn" TEXT,
ADD COLUMN     "hsCode" TEXT,
ADD COLUMN     "originCountry" TEXT,
ADD COLUMN     "weightGrams" INTEGER;
