-- AlterTable
ALTER TABLE "products" ADD COLUMN     "ageGroupEnd" INTEGER,
ADD COLUMN     "ageGroupStart" INTEGER,
ADD COLUMN     "brand" VARCHAR(100),
ADD COLUMN     "color" TEXT[],
ADD COLUMN     "discountPercent" INTEGER,
ADD COLUMN     "discountedPrice" DECIMAL(65,30);
