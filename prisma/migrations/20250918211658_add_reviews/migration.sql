/*
  Warnings:

  - You are about to drop the column `discount` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `usageCount` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `usageLimit` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `subCategory` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `discountValue` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `validFrom` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `validUntil` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subcategoryId` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('PRODUCT', 'DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- AlterEnum
ALTER TYPE "OTPType" ADD VALUE 'PHONE_CHANGE';

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropIndex
DROP INDEX "coupons_code_idx";

-- DropIndex
DROP INDEX "coupons_expiresAt_idx";

-- DropIndex
DROP INDEX "coupons_isActive_idx";

-- DropIndex
DROP INDEX "products_category_idx";

-- DropIndex
DROP INDEX "products_subCategory_idx";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "coupons" DROP COLUMN "discount",
DROP COLUMN "expiresAt",
DROP COLUMN "usageCount",
DROP COLUMN "usageLimit",
ADD COLUMN     "categoryIds" JSONB,
ADD COLUMN     "discountValue" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "isNewUserOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxDiscountAmount" DECIMAL(65,30),
ADD COLUMN     "minOrderValue" DECIMAL(65,30),
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "type" "CouponType" NOT NULL,
ADD COLUMN     "usageLimitPerUser" INTEGER,
ADD COLUMN     "usageLimitTotal" INTEGER,
ADD COLUMN     "validFrom" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "validUntil" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "email_verification_tokens" ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" DROP COLUMN "category",
DROP COLUMN "subCategory",
ADD COLUMN     "averageRating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "categoryId" INTEGER NOT NULL,
ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subcategoryId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "fullName" VARCHAR(100),
ADD COLUMN     "state" VARCHAR(100),
ADD COLUMN     "username" VARCHAR(50),
ADD COLUMN     "zip" VARCHAR(20);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ReviewType" NOT NULL,
    "productId" INTEGER,
    "orderId" INTEGER,
    "deliveryAgentId" INTEGER,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(100),
    "comment" VARCHAR(2000),
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "instructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_cards" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardholderName" TEXT NOT NULL,
    "last4" VARCHAR(4) NOT NULL,
    "brand" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "paymentGatewayToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_upis" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "vpa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_upis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpaySignature" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" VARCHAR(50),
    "gateway" VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    "gatewayResponse" JSONB,
    "failureReason" VARCHAR(500),
    "orderId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "grouping" VARCHAR(100) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_coupons" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "discountValue" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_type_productId_idx" ON "reviews"("type", "productId");

-- CreateIndex
CREATE INDEX "reviews_type_orderId_idx" ON "reviews"("type", "orderId");

-- CreateIndex
CREATE INDEX "reviews_userId_type_idx" ON "reviews"("userId", "type");

-- CreateIndex
CREATE INDEX "reviews_productId_idx" ON "reviews"("productId");

-- CreateIndex
CREATE INDEX "reviews_orderId_idx" ON "reviews"("orderId");

-- CreateIndex
CREATE INDEX "reviews_deliveryAgentId_idx" ON "reviews"("deliveryAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_productId_type_key" ON "reviews"("userId", "productId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_orderId_type_key" ON "reviews"("userId", "orderId", "type");

-- CreateIndex
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");

-- CreateIndex
CREATE INDEX "addresses_isDefault_idx" ON "addresses"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "saved_cards_paymentGatewayToken_key" ON "saved_cards"("paymentGatewayToken");

-- CreateIndex
CREATE INDEX "saved_cards_userId_idx" ON "saved_cards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_upis_vpa_key" ON "saved_upis"("vpa");

-- CreateIndex
CREATE INDEX "saved_upis_userId_idx" ON "saved_upis"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayPaymentId_key" ON "payments"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayOrderId_key" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_razorpayOrderId_idx" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "payments_razorpayPaymentId_idx" ON "payments"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_userId_razorpayOrderId_key" ON "payments"("userId", "razorpayOrderId");

-- CreateIndex
CREATE INDEX "subcategories_grouping_idx" ON "subcategories"("grouping");

-- CreateIndex
CREATE INDEX "subcategories_categoryId_idx" ON "subcategories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_name_categoryId_key" ON "subcategories"("name", "categoryId");

-- CreateIndex
CREATE INDEX "offers_categoryId_idx" ON "offers"("categoryId");

-- CreateIndex
CREATE INDEX "offers_isActive_startDate_endDate_idx" ON "offers"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_subcategoryId_idx" ON "products"("subcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_upis" ADD CONSTRAINT "saved_upis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_coupons" ADD CONSTRAINT "order_coupons_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
