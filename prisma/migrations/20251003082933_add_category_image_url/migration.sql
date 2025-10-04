/*
  Warnings:

  - You are about to alter the column `price` on the `cart_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `price` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `amount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `price` on the `products` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to drop the column `deliveryAgentId` on the `reviews` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sku]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seoSlug]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sku` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_subcategoryId_fkey";

-- DropIndex
DROP INDEX "reviews_deliveryAgentId_idx";

-- AlterTable
ALTER TABLE "cart_items" ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "iconUrl" TEXT,
ADD COLUMN     "offerTypeId" INTEGER;

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "compareAtPrice" DECIMAL(65,30),
ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "seoSlug" VARCHAR(255),
ADD COLUMN     "sku" VARCHAR(50) NOT NULL,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "weight" DECIMAL(8,3),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "deliveryAgentId";

-- AlterTable
ALTER TABLE "subcategories" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "offer_rules" (
    "id" SERIAL NOT NULL,
    "offerId" INTEGER NOT NULL,
    "priceBelow" DECIMAL(65,30),
    "priceAbove" DECIMAL(65,30),
    "minDiscount" INTEGER,
    "maxDiscount" INTEGER,
    "ageGroupStart" INTEGER,
    "ageGroupEnd" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subcategoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_assignments" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "coupon_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offer_types_name_key" ON "offer_types"("name");

-- CreateIndex
CREATE INDEX "coupon_assignments_userId_idx" ON "coupon_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_assignments_couponId_userId_key" ON "coupon_assignments"("couponId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_seoSlug_key" ON "products"("seoSlug");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_seoSlug_idx" ON "products"("seoSlug");

-- CreateIndex
CREATE INDEX "products_tags_idx" ON "products"("tags");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_rules" ADD CONSTRAINT "offer_rules_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_rules" ADD CONSTRAINT "offer_rules_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_offerTypeId_fkey" FOREIGN KEY ("offerTypeId") REFERENCES "offer_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_assignments" ADD CONSTRAINT "coupon_assignments_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_assignments" ADD CONSTRAINT "coupon_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
