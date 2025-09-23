/*
  Warnings:

  - The values [FIXED_AMOUNT] on the enum `CouponType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CouponType_new" AS ENUM ('PERCENTAGE', 'FLAT');
ALTER TABLE "coupons" ALTER COLUMN "type" TYPE "CouponType_new" USING ("type"::text::"CouponType_new");
ALTER TYPE "CouponType" RENAME TO "CouponType_old";
ALTER TYPE "CouponType_new" RENAME TO "CouponType";
DROP TYPE "CouponType_old";
COMMIT;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
